import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type AccountCategory = Database["public"]["Enums"]["account_category"];
type BalanceDirection = "credit" | "debit";

/**
 * Computes the signed delta to apply to an account balance.
 *
 * Credit cards track total spent (balance goes up on debit, down on credit).
 * Bank/third-party accounts track funds available (balance goes down on debit, up on credit).
 */
export function computeBalanceChange(
  accountCategory: AccountCategory,
  amount: number,
  direction: BalanceDirection
): number {
  if (direction === "debit") {
    // Money going out / spending
    return accountCategory === "credit_card" ? amount : -amount;
  } else {
    // Money coming in / credit
    return accountCategory === "credit_card" ? -amount : amount;
  }
}

/**
 * Reads the account, computes the delta, and writes the new balance.
 */
export async function applyBalanceChange(
  accountId: string,
  amount: number,
  direction: BalanceDirection
) {
  const supabase = await createClient();

  const { data: account } = await supabase
    .from("accounts")
    .select("current_balance, category")
    .eq("id", accountId)
    .single();

  if (!account) return;

  const delta = computeBalanceChange(account.category, amount, direction);
  const newBalance = (account.current_balance ?? 0) + delta;

  await supabase
    .from("accounts")
    .update({
      current_balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", accountId);
}

/**
 * Reverses a previous balance change (e.g. when deleting a transaction).
 */
export async function reverseBalanceChange(
  accountId: string,
  amount: number,
  direction: BalanceDirection
) {
  const opposite: BalanceDirection = direction === "credit" ? "debit" : "credit";
  await applyBalanceChange(accountId, amount, opposite);
}
