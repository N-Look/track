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

  const { error } = await supabase.from("debts").insert({
    user_id: user.id,
    creditor_name,
    amount,
    currency,
    description,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/balances");
  revalidatePath("/dashboard");
}

export async function markDebtAsPaid(debtId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("debts")
    .update({ is_paid: true, paid_at: new Date().toISOString() })
    .eq("id", debtId);

  if (error) throw new Error(error.message);
  revalidatePath("/balances");
  revalidatePath("/dashboard");
}

export async function deleteDebt(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("debts").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/balances");
  revalidatePath("/dashboard");
}
