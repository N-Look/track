"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markSplitAsPaid(
  splitId: string,
  receivingAccountId: string | null
) {
  const supabase = await createClient();

  const { data: split } = await supabase
    .from("splits")
    .select("*")
    .eq("id", splitId)
    .single();

  if (!split) throw new Error("Split not found");

  // Mark as paid
  const { error } = await supabase
    .from("splits")
    .update({ is_paid: true, paid_at: new Date().toISOString() })
    .eq("id", splitId);

  if (error) throw new Error(error.message);

  // Credit the receiving account
  if (receivingAccountId) {
    const { data: account } = await supabase
      .from("accounts")
      .select("current_balance, category")
      .eq("id", receivingAccountId)
      .single();

    if (account) {
      // Credit cards: subtract (paying off balance), others: add
      const newBalance =
        account.category === "credit_card"
          ? (account.current_balance ?? 0) - split.amount_owed
          : (account.current_balance ?? 0) + split.amount_owed;
      await supabase
        .from("accounts")
        .update({
          current_balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", receivingAccountId);
    }
  }

  revalidatePath("/balances");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
}
