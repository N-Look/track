"use server";

import { createClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai";
import type { QuickAddResult } from "@/lib/ai/types";

export async function parseReceipt(formData: FormData): Promise<QuickAddResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const file = formData.get("receipt") as File;
  if (!file || file.size === 0) throw new Error("No receipt image provided");

  const currency = (formData.get("currency") as string) || "CAD";

  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  const provider = getAIProvider();
  return provider.parseReceiptImage(base64, file.type, currency);
}

export async function parseText(formData: FormData): Promise<QuickAddResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const text = formData.get("text") as string;
  if (!text?.trim()) throw new Error("No text provided");

  const currency = (formData.get("currency") as string) || "CAD";

  const provider = getAIProvider();
  return provider.parseNaturalLanguage(text.trim(), currency);
}
