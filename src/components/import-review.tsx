"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmImportedTransactions } from "@/lib/actions/imports";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, Pencil, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/lib/supabase/types";

type ImportedTransaction = Tables<"imported_transactions">;

interface TransactionEdit {
  description?: string;
  amount?: number;
  transaction_date?: string;
}

function ConfidenceBadge({ score }: { score: number }) {
  if (score >= 80) {
    return (
      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
        {score}%
      </Badge>
    );
  }
  if (score >= 60) {
    return (
      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
        {score}%
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
      {score}%
    </Badge>
  );
}

export function ImportReview({
  batchId,
  transactions,
  batchFilename,
}: {
  batchId: string;
  transactions: ImportedTransaction[];
  batchFilename: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(transactions.map((t) => t.id))
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, TransactionEdit>>({});
  const [editDraft, setEditDraft] = useState<TransactionEdit>({});

  function toggleAll() {
    if (selected.size === transactions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(transactions.map((t) => t.id)));
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  }

  function startEdit(t: ImportedTransaction) {
    setEditingId(t.id);
    setEditDraft({
      description: edits[t.id]?.description ?? t.description,
      amount: edits[t.id]?.amount ?? t.amount,
      transaction_date: edits[t.id]?.transaction_date ?? t.transaction_date,
    });
  }

  function saveEdit(id: string) {
    setEdits({ ...edits, [id]: editDraft });
    setEditingId(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft({});
  }

  function getDisplay(t: ImportedTransaction) {
    const edit = edits[t.id];
    return {
      description: edit?.description ?? t.description,
      amount: edit?.amount ?? t.amount,
      transaction_date: edit?.transaction_date ?? t.transaction_date,
    };
  }

  async function handleConfirm() {
    setLoading(true);
    try {
      await confirmImportedTransactions(
        batchId,
        Array.from(selected),
        edits
      );
      toast.success(`Confirmed ${selected.size} transactions`);
      router.push("/transactions");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to confirm transactions"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Review Import</h1>
          <p className="text-muted-foreground mt-1">
            {batchFilename} — {transactions.length} transactions extracted
          </p>
        </div>
        <Button
          onClick={handleConfirm}
          disabled={loading || selected.size === 0}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Confirming...
            </>
          ) : (
            `Confirm ${selected.size} Transaction${selected.size !== 1 ? "s" : ""}`
          )}
        </Button>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={selected.size === transactions.length}
                  onChange={toggleAll}
                  className="rounded"
                />
              </TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-center">Confidence</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((t) => {
              const display = getDisplay(t);
              const isEditing = editingId === t.id;

              return (
                <TableRow
                  key={t.id}
                  className={!selected.has(t.id) ? "opacity-40" : ""}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selected.has(t.id)}
                      onChange={() => toggleOne(t.id)}
                      className="rounded"
                    />
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={editDraft.transaction_date ?? ""}
                        onChange={(e) =>
                          setEditDraft({
                            ...editDraft,
                            transaction_date: e.target.value,
                          })
                        }
                        className="w-36"
                      />
                    ) : (
                      display.transaction_date
                    )}
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    {isEditing ? (
                      <Input
                        value={editDraft.description ?? ""}
                        onChange={(e) =>
                          setEditDraft({
                            ...editDraft,
                            description: e.target.value,
                          })
                        }
                      />
                    ) : (
                      <span className="truncate block">
                        {display.description}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editDraft.amount ?? ""}
                        onChange={(e) =>
                          setEditDraft({
                            ...editDraft,
                            amount: parseFloat(e.target.value),
                          })
                        }
                        className="w-28 ml-auto"
                      />
                    ) : (
                      `$${display.amount.toFixed(2)}`
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <ConfidenceBadge score={t.confidence_score} />
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => saveEdit(t.id)}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={cancelEdit}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => startEdit(t)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
