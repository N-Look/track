"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { applyBalanceChange } from "./balance";

export async function markSplitAsPaid(
  splitId: string,
  receivingAccountId: string | null
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: split } = await supabase
    .from("splits")
    .select("*, transactions(description, currency)")
    .eq("id", splitId)
    .single();

  if (!split) throw new Error("Split not found");

  // Mark as paid
  const { error } = await supabase
    .from("splits")
    .update({ is_paid: true, paid_at: new Date().toISOString() })
    .eq("id", splitId);

  if (error) throw new Error(error.message);

  const txDescription = (split.transactions as { description: string; currency: string } | null)?.description ?? "Unknown";
  const txCurrency = (split.transactions as { description: string; currency: string } | null)?.currency ?? "CAD";

  // Create transaction for audit trail — split received = credit (money in)
  await supabase.from("transactions").insert({
    user_id: user.id,
    account_id: receivingAccountId,
    description: `Split received: ${txDescription} from ${split.debtor_name}`,
    amount: split.amount_owed,
    currency: txCurrency as "CAD" | "TTD" | "USD",
    category: "other" as const,
    is_repayment: true,
    balance_direction: "credit",
  });

  // Credit the receiving account
  if (receivingAccountId) {
    await applyBalanceChange(receivingAccountId, split.amount_owed, "credit");
  }

  revalidatePath("/balances");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  revalidatePath("/transactions");
}
