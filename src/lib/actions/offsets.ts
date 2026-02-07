"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type CurrencyType = Database["public"]["Enums"]["currency_type"];

export async function createOffset(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const debtor_name = formData.get("debtor_name") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const currency = formData.get("currency") as CurrencyType;
  const description = (formData.get("description") as string) || null;

  const { error } = await supabase.from("offsets").insert({
    user_id: user.id,
    debtor_name,
    amount,
    currency,
    description,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/owed");
  revalidatePath("/dashboard");
}

export async function deleteOffset(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("offsets").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/owed");
  revalidatePath("/dashboard");
}
