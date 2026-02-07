import { createClient } from "@/lib/supabase/server";
import { ImportReview } from "@/components/import-review";
import { redirect } from "next/navigation";

export default async function ImportReviewPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  const supabase = await createClient();

  const [{ data: batch }, { data: transactions }] = await Promise.all([
    supabase
      .from("import_batches")
      .select("*")
      .eq("id", batchId)
      .single(),
    supabase
      .from("imported_transactions")
      .select("*")
      .eq("import_batch_id", batchId)
      .order("transaction_date", { ascending: true }),
  ]);

  if (!batch) redirect("/imports");

  if (batch.status === "completed") redirect("/imports");

  return (
    <ImportReview
      batchId={batchId}
      transactions={transactions ?? []}
      batchFilename={batch.filename}
    />
  );
}
