"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { applyBalanceChange, reverseBalanceChange } from "./balance";

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
  const category = (formData.get("category") as string) || "other";
  const splitsJson = formData.get("splits") as string | null;
  const splits: SplitInput[] = splitsJson ? JSON.parse(splitsJson) : [];

  const balance_direction = is_repayment ? "credit" : "debit" as const;

  // Insert the transaction
  const { data: transaction, error: txError } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      account_id: account_id || null,
      description,
      amount,
      currency,
      category: category as Database["public"]["Enums"]["transaction_category"],
      transaction_date: transaction_date || undefined,
      is_repayment,
      is_transfer_to_third_party: is_transfer,
      fee_lost: is_transfer ? fee_lost : 0,
      balance_direction,
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

  // Update account balance
  if (account_id) {
    await applyBalanceChange(account_id, amount, balance_direction);
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/balances");
}

export async function updateTransaction(formData: FormData) {
  const supabase = await createClient();

  const transactionId = formData.get("transactionId") as string;
  const description = formData.get("description") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const transaction_date = formData.get("transaction_date") as string;
  const category = formData.get("category") as Database["public"]["Enums"]["transaction_category"];
  const fee_lost = formData.get("fee_lost")
    ? parseFloat(formData.get("fee_lost") as string)
    : null;
  const newDirection = formData.get("balance_direction") as "credit" | "debit" | null;

  // Fetch old transaction to calculate balance diff
  const { data: oldTx } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", transactionId)
    .single();

  if (!oldTx) throw new Error("Transaction not found");

  const direction = newDirection ?? oldTx.balance_direction;
  const amountChanged = amount !== oldTx.amount;
  const directionChanged = direction !== oldTx.balance_direction;

  // Update the transaction
  const updateData: Record<string, unknown> = {
    description,
    amount,
    transaction_date: transaction_date || null,
    category,
    balance_direction: direction,
    is_repayment: direction === "credit",
  };
  if (fee_lost !== null) {
    updateData.fee_lost = fee_lost;
  }
  const { error } = await supabase
    .from("transactions")
    .update(updateData)
    .eq("id", transactionId);

  if (error) throw new Error(error.message);

  // Adjust account balance if amount or direction changed
  if (oldTx.account_id && (amountChanged || directionChanged)) {
    await reverseBalanceChange(oldTx.account_id, oldTx.amount, oldTx.balance_direction);
    await applyBalanceChange(oldTx.account_id, amount, direction);
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/balances");
  revalidatePath("/accounts");
}

export async function updateTransactionSplits(
  transactionId: string,
  splits: { debtor_name: string; amount_owed: number }[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Delete existing splits
  await supabase.from("splits").delete().eq("transaction_id", transactionId);

  // Insert new splits if any
  if (splits.length > 0) {
    const rows = splits.map((s) => ({
      transaction_id: transactionId,
      debtor_name: s.debtor_name,
      amount_owed: s.amount_owed,
    }));
    const { error } = await supabase.from("splits").insert(rows);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/balances");
}

export async function createAccountTransfer(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const from_account_id = formData.get("from_account_id") as string;
  const to_account_id = formData.get("to_account_id") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const transaction_date = formData.get("transaction_date") as string;
  const note = (formData.get("note") as string)?.trim() || "";

  if (!from_account_id || !to_account_id) throw new Error("Both accounts are required");
  if (from_account_id === to_account_id) throw new Error("Cannot transfer to the same account");
  if (!amount || amount <= 0) throw new Error("Amount must be greater than 0");

  const { data: accountRows } = await supabase
    .from("accounts")
    .select("id, name, currency")
    .in("id", [from_account_id, to_account_id]);

  if (!accountRows || accountRows.length !== 2) throw new Error("One or both accounts not found");

  const fromAccount = accountRows.find((a) => a.id === from_account_id)!;
  const toAccount = accountRows.find((a) => a.id === to_account_id)!;

  const fromDesc = note ? `Transfer to ${toAccount.name}: ${note}` : `Transfer to ${toAccount.name}`;
  const toDesc = note ? `Transfer from ${fromAccount.name}: ${note}` : `Transfer from ${fromAccount.name}`;

  const { error: err1 } = await supabase.from("transactions").insert({
    user_id: user.id,
    account_id: from_account_id,
    description: fromDesc,
    amount,
    currency: fromAccount.currency as CurrencyType,
    category: "transfer",
    transaction_date: transaction_date || undefined,
    is_repayment: false,
    is_transfer_to_third_party: false,
    balance_direction: "debit",
  });
  if (err1) throw new Error(err1.message);

  const { error: err2 } = await supabase.from("transactions").insert({
    user_id: user.id,
    account_id: to_account_id,
    description: toDesc,
    amount,
    currency: toAccount.currency as CurrencyType,
    category: "transfer",
    transaction_date: transaction_date || undefined,
    is_repayment: true,
    is_transfer_to_third_party: false,
    balance_direction: "credit",
  });
  if (err2) throw new Error(err2.message);

  await applyBalanceChange(from_account_id, amount, "debit");
  await applyBalanceChange(to_account_id, amount, "credit");

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/balances");
  revalidatePath("/accounts");
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

  // Unlink any debts referencing this transaction (FK constraint)
  await supabase
    .from("debts")
    .update({ linked_transaction_id: null })
    .eq("linked_transaction_id", id);

  // Delete the transaction
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw new Error(error.message);

  // Reverse balance change using stored direction
  if (transaction.account_id) {
    await reverseBalanceChange(
      transaction.account_id,
      transaction.amount,
      transaction.balance_direction
    );
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/balances");
}
