"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

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

  // Create a memo transaction for audit trail
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

  // Create payment transaction for audit trail
  const { error: txError } = await supabase.from("transactions").insert({
    user_id: user.id,
    account_id: accountId,
    description: `Debt payment: ${debt.description || "No description"} to ${debt.creditor_name}`,
    amount: debt.amount,
    currency: debt.currency,
    category: "other" as Database["public"]["Enums"]["transaction_category"],
    is_repayment: true,
  });

  if (txError) throw new Error(txError.message);

  // Update account balance if an account was selected
  if (accountId) {
    const { data: account } = await supabase
      .from("accounts")
      .select("current_balance, category")
      .eq("id", accountId)
      .single();

    if (account) {
      // Credit cards: add to balance (paying with credit increases balance)
      // Other accounts: subtract from balance (money leaving account)
      const newBalance =
        account.category === "credit_card"
          ? (account.current_balance ?? 0) + debt.amount
          : (account.current_balance ?? 0) - debt.amount;
      await supabase
        .from("accounts")
        .update({
          current_balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", accountId);
    }
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
