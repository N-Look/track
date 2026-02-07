import { createClient } from "@/lib/supabase/server";
import { ImportUpload } from "@/components/import-upload";
import { deleteImportBatch } from "@/lib/actions/imports";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, FileText } from "lucide-react";

export default async function ImportsPage() {
  const supabase = await createClient();

  const [{ data: accounts }, { data: batches }] = await Promise.all([
    supabase.from("accounts").select("*").order("name"),
    supabase
      .from("import_batches")
      .select("*, accounts(name)")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Imports</h1>
        <ImportUpload accounts={accounts ?? []} />
      </div>

      {!batches?.length ? (
        <div className="glass rounded-xl p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium mb-1">No imports yet</h2>
          <p className="text-muted-foreground text-sm">
            Upload a PDF bank statement to get started
          </p>
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-center">Transactions</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell>
                    {batch.status === "pending" ? (
                      <Link
                        href={`/imports/${batch.id}`}
                        className="text-primary hover:underline font-medium"
                      >
                        {batch.filename}
                      </Link>
                    ) : (
                      <span className="font-medium">{batch.filename}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {(batch.accounts as { name: string } | null)?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    {batch.status === "completed" ? (
                      <span>
                        {batch.confirmed_count} confirmed
                        {batch.rejected_count > 0 &&
                          `, ${batch.rejected_count} rejected`}
                      </span>
                    ) : (
                      batch.total_transactions
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {batch.status === "completed" ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                        Completed
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                        Pending Review
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(batch.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <form
                      action={async () => {
                        "use server";
                        await deleteImportBatch(batch.id);
                      }}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
