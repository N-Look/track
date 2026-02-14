"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteTransaction } from "@/lib/actions/transactions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/lib/supabase/types";
import { TransactionEditDialog } from "@/components/transaction-edit-dialog";
import { formatAmount } from "@/lib/currency";

interface TransactionWithRelations {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  transaction_date: string | null;
  is_repayment: boolean | null;
  is_transfer_to_third_party: boolean | null;
  fee_lost: number | null;
  account_id: string | null;
  splits: { id: string; debtor_name: string; amount_owed: number; is_paid: boolean | null }[];
  accounts: { name: string } | null;
}

const currencySymbols: Record<string, string> = {
  CAD: "CA$",
  TTD: "TT$",
  USD: "US$",
};

const CATEGORIES = [
  "food", "groceries", "transportation", "entertainment", "utilities",
  "shopping", "health", "education", "transfer", "other",
] as const;

const categoryLabels: Record<string, string> = {
  food: "Food",
  groceries: "Groceries",
  transportation: "Transport",
  entertainment: "Entertainment",
  utilities: "Utilities",
  shopping: "Shopping",
  health: "Health",
  education: "Education",
  transfer: "Transfer",
  other: "Other",
};

export function TransactionList({
  transactions,
  accounts,
}: {
  transactions: TransactionWithRelations[];
  accounts: Tables<"accounts">[];
}) {
  const router = useRouter();
  const [filterAccount, setFilterAccount] = useState("all");
  const [filterCurrency, setFilterCurrency] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingTx, setEditingTx] = useState<TransactionWithRelations | null>(null);

  // Build unique months from transactions (YYYY-MM)
  const months = Array.from(
    new Set(
      transactions
        .map((tx) => tx.transaction_date?.slice(0, 7))
        .filter(Boolean) as string[]
    )
  ).sort((a, b) => b.localeCompare(a));

  const filtered = transactions.filter((tx) => {
    if (filterAccount !== "all" && tx.account_id !== filterAccount) return false;
    if (filterCurrency !== "all" && tx.currency !== filterCurrency) return false;
    if (filterCategory !== "all" && tx.category !== filterCategory) return false;
    if (filterMonth !== "all" && tx.transaction_date && !tx.transaction_date.startsWith(filterMonth))
      return false;
    return true;
  });

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteTransaction(id);
      toast.success("Transaction deleted");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
        <Select value={filterAccount} onValueChange={setFilterAccount}>
          <SelectTrigger className="sm:w-[180px]">
            <SelectValue placeholder="All Accounts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Accounts</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCurrency} onValueChange={setFilterCurrency}>
          <SelectTrigger className="sm:w-[120px]">
            <SelectValue placeholder="Currency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="CAD">CAD</SelectItem>
            <SelectItem value="TTD">TTD</SelectItem>
            <SelectItem value="USD">USD</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="sm:w-[150px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {categoryLabels[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="sm:w-[160px]">
            <SelectValue placeholder="All Months" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {months.map((m) => {
              const [y, mo] = m.split("-");
              const label = new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
              });
              return (
                <SelectItem key={m} value={m}>
                  {label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          No transactions found.
        </p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block glass rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((tx) => {
                  const symbol = currencySymbols[tx.currency] ?? "$";
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap">
                        {tx.transaction_date ?? "—"}
                      </TableCell>
                      <TableCell>{tx.description}</TableCell>
                      <TableCell>{tx.accounts?.name ?? "—"}</TableCell>
                      <TableCell className={`whitespace-nowrap font-medium ${tx.amount < 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {formatAmount(tx.amount, symbol)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="secondary">
                            {categoryLabels[tx.category] ?? tx.category}
                          </Badge>
                          {tx.is_repayment && (
                            <Badge variant="secondary">Repayment</Badge>
                          )}
                          {tx.splits.length > 0 && (
                            <Badge variant="outline">
                              Split ({tx.splits.length})
                            </Badge>
                          )}
                          {(tx.fee_lost ?? 0) > 0 && (
                            <Badge variant="destructive">
                              Fee: ${tx.fee_lost}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingTx(tx)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={deletingId === tx.id}
                            onClick={() => handleDelete(tx.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((tx) => {
              const symbol = currencySymbols[tx.currency] ?? "$";
              return (
                <div
                  key={tx.id}
                  className="glass rounded-xl p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {tx.transaction_date ?? "—"}
                        {tx.accounts?.name ? ` · ${tx.accounts.name}` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-semibold ${tx.amount < 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {formatAmount(tx.amount, symbol)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary">
                        {categoryLabels[tx.category] ?? tx.category}
                      </Badge>
                      {tx.is_repayment && (
                        <Badge variant="secondary">Repayment</Badge>
                      )}
                      {tx.splits.length > 0 && (
                        <Badge variant="outline">
                          Split ({tx.splits.length})
                        </Badge>
                      )}
                      {(tx.fee_lost ?? 0) > 0 && (
                        <Badge variant="destructive">
                          Fee: ${tx.fee_lost}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingTx(tx)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={deletingId === tx.id}
                        onClick={() => handleDelete(tx.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {editingTx && (
        <TransactionEditDialog
          transaction={editingTx}
          open={editingTx !== null}
          onOpenChange={(open) => {
            if (!open) setEditingTx(null);
          }}
        />
      )}
    </div>
  );
}
