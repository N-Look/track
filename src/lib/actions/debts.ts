"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { applyBalanceChange } from "./balance";

type CurrencyType = Database["public"]["Enums"]["currency_type"];

export async function createDebt(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const creditor_name = formData.get("creditor_name") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const currency = formData.get("currency") as CurrencyType;
  const description = (formData.get("description") as string) || null;

  // Create a memo transaction for audit trail (no account, just a record)
  const { data: transaction, error: txError } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      account_id: null,
      description: `Debt: ${description || "No description"} (owed to ${creditor_name})`,
      amount,
      currency,
      category: "other" as Database["public"]["Enums"]["transaction_category"],
      is_repayment: false,
      balance_direction: "debit",
    })
    .select()
    .single();

  if (txError) throw new Error(txError.message);

  // Insert the debt with linked transaction
  const { error } = await supabase.from("debts").insert({
    user_id: user.id,
    creditor_name,
    amount,
    currency,
    description,
    linked_transaction_id: transaction.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/balances");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
}

export async function markDebtAsPaid(debtId: string, accountId: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Fetch debt details
  const { data: debt } = await supabase
    .from("debts")
    .select("*")
    .eq("id", debtId)
    .single();

  if (!debt) throw new Error("Debt not found");

  // Create payment transaction for audit trail — debt payment = debit (money out)
  const { error: txError } = await supabase.from("transactions").insert({
    user_id: user.id,
    account_id: accountId,
    description: `Debt payment: ${debt.description || "No description"} to ${debt.creditor_name}`,
    amount: debt.amount,
    currency: debt.currency,
    category: "other" as Database["public"]["Enums"]["transaction_category"],
    is_repayment: true,
    balance_direction: "debit",
  });

  if (txError) throw new Error(txError.message);

  // Update account balance if an account was selected
  if (accountId) {
    await applyBalanceChange(accountId, debt.amount, "debit");
  }

  // Mark debt as paid
  const { error } = await supabase
    .from("debts")
    .update({ is_paid: true, paid_at: new Date().toISOString() })
    .eq("id", debtId);

  if (error) throw new Error(error.message);
  revalidatePath("/balances");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
}

export async function deleteDebt(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("debts").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/balances");
  revalidatePath("/dashboard");
}
