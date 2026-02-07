"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type AccountCategory = Database["public"]["Enums"]["account_category"];
type CurrencyType = Database["public"]["Enums"]["currency_type"];

export async function createAccount(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const name = formData.get("name") as string;
  const category = formData.get("category") as AccountCategory;
  const currency = formData.get("currency") as CurrencyType;

  const { error } = await supabase.from("accounts").insert({
    user_id: user.id,
    name,
    category,
    currency,
    current_balance: 0,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function updateAccount(id: string, formData: FormData) {
  const supabase = await createClient();
  const name = formData.get("name") as string;
  const category = formData.get("category") as AccountCategory;
  const currency = formData.get("currency") as CurrencyType;

  const { error } = await supabase
    .from("accounts")
    .update({ name, category, currency, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function updateAccountBalance(id: string, newBalance: number) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("accounts")
    .update({
      current_balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function deleteAccount(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("accounts").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}
