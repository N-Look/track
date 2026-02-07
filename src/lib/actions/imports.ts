"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai";
import { PDFParse } from "pdf-parse";

export async function parseStatement(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const file = formData.get("file") as File;
  const accountId = formData.get("account_id") as string;

  if (!file || !accountId) throw new Error("File and account are required");

  // Get account for currency
  const { data: account } = await supabase
    .from("accounts")
    .select("currency")
    .eq("id", accountId)
    .single();

  if (!account) throw new Error("Account not found");

  // Extract text from PDF
  const buffer = Buffer.from(await file.arrayBuffer());
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const textResult = await parser.getText();
  const text = textResult.text;
  await parser.destroy();

  if (!text.trim()) throw new Error("Could not extract text from PDF");

  // Send to AI for extraction
  const provider = getAIProvider();
  const providerName = process.env.AI_PROVIDER ?? "perplexity";
  const extracted = await provider.extractTransactions(text, account.currency);

  if (extracted.length === 0) throw new Error("No transactions found in statement");

  // Create import batch
  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .insert({
      user_id: user.id,
      account_id: accountId,
      filename: file.name,
      total_transactions: extracted.length,
    })
    .select()
    .single();

  if (batchError) throw new Error(batchError.message);

  // Insert imported transactions
  const rows = extracted.map((t) => ({
    user_id: user.id,
    account_id: accountId,
    import_batch_id: batch.id,
    amount: t.amount,
    currency: account.currency,
    description: t.description,
    transaction_date: t.date,
    original_text: t.original_text,
    confidence_score: t.confidence,
    ai_provider: providerName,
  }));

  const { error: txError } = await supabase
    .from("imported_transactions")
    .insert(rows);

  if (txError) throw new Error(txError.message);

  revalidatePath("/imports");
  return { batchId: batch.id, count: extracted.length };
}

interface TransactionEdit {
  description?: string;
  amount?: number;
  transaction_date?: string;
}

export async function confirmImportedTransactions(
  batchId: string,
  selectedIds: string[],
  edits: Record<string, TransactionEdit>
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Get all imported transactions for this batch
  const { data: imported } = await supabase
    .from("imported_transactions")
    .select("*")
    .eq("import_batch_id", batchId)
    .eq("user_id", user.id);

  if (!imported) throw new Error("No imported transactions found");

  const selected = imported.filter((t) => selectedIds.includes(t.id));
  const rejected = imported.filter((t) => !selectedIds.includes(t.id));

  if (selected.length === 0) throw new Error("No transactions selected");

  // Get account info for balance updates
  const accountId = selected[0].account_id;
  const { data: account } = await supabase
    .from("accounts")
    .select("current_balance, category")
    .eq("id", accountId)
    .single();

  if (!account) throw new Error("Account not found");

  // Create real transactions from selected imports
  const realTransactions = selected.map((t) => {
    const edit = edits[t.id];
    return {
      user_id: user.id,
      account_id: accountId,
      description: edit?.description ?? t.description,
      amount: edit?.amount ?? t.amount,
      currency: t.currency,
      transaction_date: edit?.transaction_date ?? t.transaction_date,
    };
  });

  const { error: insertError } = await supabase
    .from("transactions")
    .insert(realTransactions);

  if (insertError) throw new Error(insertError.message);

  // Update account balance
  const totalAmount = realTransactions.reduce((sum, t) => sum + t.amount, 0);
  const newBalance =
    account.category === "credit_card"
      ? (account.current_balance ?? 0) + totalAmount
      : (account.current_balance ?? 0) - totalAmount;

  await supabase
    .from("accounts")
    .update({
      current_balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", accountId);

  // Mark confirmed
  const now = new Date().toISOString();
  await supabase
    .from("imported_transactions")
    .update({ status: "confirmed", reviewed_at: now })
    .in(
      "id",
      selected.map((t) => t.id)
    );

  // Mark rejected
  if (rejected.length > 0) {
    await supabase
      .from("imported_transactions")
      .update({ status: "rejected", reviewed_at: now })
      .in(
        "id",
        rejected.map((t) => t.id)
      );
  }

  // Update batch
  await supabase
    .from("import_batches")
    .update({
      status: "completed",
      confirmed_count: selected.length,
      rejected_count: rejected.length,
    })
    .eq("id", batchId);

  revalidatePath("/imports");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/balances");
}

export async function deleteImportBatch(batchId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Delete imported transactions first (FK constraint)
  await supabase
    .from("imported_transactions")
    .delete()
    .eq("import_batch_id", batchId)
    .eq("user_id", user.id);

  const { error } = await supabase
    .from("import_batches")
    .delete()
    .eq("id", batchId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/imports");
}
