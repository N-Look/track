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
  direction: "they_pay" | "you_pay"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const balance_direction = direction === "they_pay" ? "credit" : "debit" as const;

  if (direction === "they_pay") {
    // They owe you -> mark splits as paid, credit your account
    const { data: splits } = await supabase
      .from("splits")
      .select("*, transactions(currency)")
      .eq("debtor_name", personName)
      .eq("is_paid", false);

    const matchingSplits = (splits ?? []).filter(
      (s) =>
        (s.transactions as { currency: string } | null)?.currency === currency
    );

    let remaining = amount;
    for (const split of matchingSplits) {
      if (remaining <= 0) break;
      if (split.amount_owed <= remaining) {
        await supabase
          .from("splits")
          .update({ is_paid: true, paid_at: new Date().toISOString() })
          .eq("id", split.id);
        remaining -= split.amount_owed;
      } else {
        await supabase
          .from("splits")
          .update({ amount_owed: split.amount_owed - remaining })
          .eq("id", split.id);
        remaining = 0;
      }
    }
  } else {
    // You owe them -> mark debts as paid, debit your account
    const { data: debts } = await supabase
      .from("debts")
      .select("*")
      .eq("creditor_name", personName)
      .eq("currency", currency)
      .eq("is_paid", false);

    let remaining = amount;
    for (const debt of debts ?? []) {
      if (remaining <= 0) break;
      if (debt.amount <= remaining) {
        await supabase
          .from("debts")
          .update({ is_paid: true, paid_at: new Date().toISOString() })
          .eq("id", debt.id);
        remaining -= debt.amount;
      } else {
        await supabase
          .from("debts")
          .update({ amount: debt.amount - remaining })
          .eq("id", debt.id);
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
