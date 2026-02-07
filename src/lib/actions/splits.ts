"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markSplitAsPaid(splitId: string) {
  const supabase = await createClient();

  // Get the split with its transaction to find the account
  const { data: split } = await supabase
    .from("splits")
    .select("*, transactions(account_id)")
    .eq("id", splitId)
    .single();

  if (!split) throw new Error("Split not found");

  // Mark as paid
  const { error } = await supabase
    .from("splits")
    .update({ is_paid: true, paid_at: new Date().toISOString() })
    .eq("id", splitId);

  if (error) throw new Error(error.message);

  // Add amount back to account balance (skip credit cards)
  const accountId = (split.transactions as { account_id: string | null })
    ?.account_id;
  if (accountId) {
    const { data: account } = await supabase
      .from("accounts")
      .select("current_balance, category")
      .eq("id", accountId)
      .single();

    if (account && account.category !== "credit_card") {
      const newBalance = (account.current_balance ?? 0) + split.amount_owed;
      await supabase
        .from("accounts")
        .update({
          current_balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", accountId);
    }
  }

  revalidatePath("/owed");
  revalidatePath("/dashboard");
}
