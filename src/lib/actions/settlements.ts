"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { applyBalanceChange } from "./balance";

type CurrencyType = Database["public"]["Enums"]["currency_type"];

export async function settleUp(
  personName: string,
  accountId: string,
  currency: CurrencyType,
  amount: number,
  direction: "they_pay" | "you_pay",
  selectedItemIds?: string[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const balance_direction = direction === "they_pay" ? "credit" : "debit" as const;

  if (direction === "they_pay") {
    // They owe you -> mark splits as paid, credit your account
    let splitsQuery = supabase
      .from("splits")
      .select("*, transactions(currency, transaction_date)")
      .eq("debtor_name", personName)
      .eq("is_paid", false);

    if (selectedItemIds && selectedItemIds.length > 0) {
      splitsQuery = splitsQuery.in("id", selectedItemIds);
    }

    const { data: splits, error: splitsError } = await splitsQuery;

    if (splitsError) throw new Error("Failed to fetch splits: " + splitsError.message);

    const matchingSplits = (splits ?? []).filter(
      (s) =>
        (s.transactions as { currency: string } | null)?.currency === currency
    );

    let remaining = amount;
    for (const split of matchingSplits) {
      if (remaining <= 0) break;
      if (split.amount_owed <= remaining) {
        const { error } = await supabase
          .from("splits")
          .update({ is_paid: true, paid_at: new Date().toISOString() })
          .eq("id", split.id);
        if (error) console.error("Failed to update split:", error);
        remaining -= split.amount_owed;
      } else {
        const { error } = await supabase
          .from("splits")
          .update({ amount_owed: split.amount_owed - remaining })
          .eq("id", split.id);
        if (error) console.error("Failed to update split:", error);
        remaining = 0;
      }
    }
  } else {
    // You owe them -> mark debts as paid, debit your account
    let debtsQuery = supabase
      .from("debts")
      .select("*")
      .eq("creditor_name", personName)
      .eq("currency", currency)
      .eq("is_paid", false)
      .order("created_at", { ascending: true });

    if (selectedItemIds && selectedItemIds.length > 0) {
      debtsQuery = debtsQuery.in("id", selectedItemIds);
    }

    const { data: debts, error: debtsError } = await debtsQuery;

    if (debtsError) throw new Error("Failed to fetch debts: " + debtsError.message);

    let remaining = amount;
    for (const debt of debts ?? []) {
      if (remaining <= 0) break;
      if (debt.amount <= remaining) {
        const { error } = await supabase
          .from("debts")
          .update({ is_paid: true, paid_at: new Date().toISOString() })
          .eq("id", debt.id);
        if (error) console.error("Failed to update debt:", error);
        remaining -= debt.amount;
      } else {
        const { error } = await supabase
          .from("debts")
          .update({ amount: debt.amount - remaining })
          .eq("id", debt.id);
        if (error) console.error("Failed to update debt:", error);
        remaining = 0;
      }
    }
  }

  // Apply balance change using the helper
  await applyBalanceChange(accountId, amount, balance_direction);

  // Create a settlement transaction for audit trail
  await supabase.from("transactions").insert({
    user_id: user.id,
    account_id: accountId,
    description: `Settlement with ${personName}`,
    amount,
    currency,
    category: "transfer",
    transaction_date: new Date().toISOString().split("T")[0],
    is_repayment: true,
    balance_direction,
  });

  revalidatePath("/balances");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}
