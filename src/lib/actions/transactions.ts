"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type CurrencyType = Database["public"]["Enums"]["currency_type"];

interface SplitInput {
  debtor_name: string;
  amount_owed: number;
}

export async function createTransaction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const account_id = formData.get("account_id") as string;
  const description = formData.get("description") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const currency = formData.get("currency") as CurrencyType;
  const transaction_date = formData.get("transaction_date") as string;
  const is_repayment = formData.get("is_repayment") === "true";
  const is_transfer = formData.get("is_transfer_to_third_party") === "true";
  const fee_lost = formData.get("fee_lost")
    ? parseFloat(formData.get("fee_lost") as string)
    : 0;
  const splitsJson = formData.get("splits") as string | null;
  const splits: SplitInput[] = splitsJson ? JSON.parse(splitsJson) : [];

  // Insert the transaction
  const { data: transaction, error: txError } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      account_id: account_id || null,
      description,
      amount,
      currency,
      transaction_date: transaction_date || undefined,
      is_repayment,
      is_transfer_to_third_party: is_transfer,
      fee_lost: is_transfer ? fee_lost : 0,
    })
    .select()
    .single();

  if (txError) throw new Error(txError.message);

  // Insert splits if any
  if (splits.length > 0) {
    const splitRows = splits.map((s) => ({
      transaction_id: transaction.id,
      debtor_name: s.debtor_name,
      amount_owed: s.amount_owed,
    }));
    const { error: splitError } = await supabase
      .from("splits")
      .insert(splitRows);
    if (splitError) throw new Error(splitError.message);
  }

  // Deduct from account balance (skip credit cards)
  if (account_id) {
    const { data: account } = await supabase
      .from("accounts")
      .select("current_balance, category")
      .eq("id", account_id)
      .single();

    if (account && account.category !== "credit_card") {
      const newBalance = (account.current_balance ?? 0) - amount;
      await supabase
        .from("accounts")
        .update({
          current_balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", account_id);
    }
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/owed");
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient();

  // Get transaction to reverse balance
  const { data: transaction } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .single();

  if (!transaction) throw new Error("Transaction not found");

  // Delete splits first (FK constraint)
  await supabase.from("splits").delete().eq("transaction_id", id);

  // Delete the transaction
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw new Error(error.message);

  // Reverse balance change (skip credit cards)
  if (transaction.account_id) {
    const { data: account } = await supabase
      .from("accounts")
      .select("current_balance, category")
      .eq("id", transaction.account_id)
      .single();

    if (account && account.category !== "credit_card") {
      const newBalance = (account.current_balance ?? 0) + transaction.amount;
      await supabase
        .from("accounts")
        .update({
          current_balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.account_id);
    }
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/owed");
}
