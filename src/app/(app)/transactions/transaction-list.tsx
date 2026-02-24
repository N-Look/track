"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteTransaction } from "@/lib/actions/transactions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pencil,
  Trash2,
  Utensils,
  ShoppingCart,
  Car,
  Film,
  Zap,
  ShoppingBag,
  Heart,
  GraduationCap,
  ArrowRightLeft,
  MoreHorizontal,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/lib/supabase/types";
import { TransactionEditDialog } from "@/components/transaction-edit-dialog";
import { formatAmount } from "@/lib/currency";
import { FilterDialog, type FilterState } from "@/components/filter-dialog";

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
  balance_direction: "credit" | "debit";
  splits: { id: string; debtor_name: string; amount_owed: number; is_paid: boolean | null }[];
  accounts: { name: string } | null;
}

const currencySymbols: Record<string, string> = {
  CAD: "CA$",
  TTD: "TT$",
  USD: "US$",
};

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

const CategoryIcon = ({ category }: { category: string }) => {
  const iconProps = { className: "h-4 w-4" };
  switch (category) {
    case "food": return <Utensils {...iconProps} />;
    case "groceries": return <ShoppingCart {...iconProps} />;
    case "transportation": return <Car {...iconProps} />;
    case "entertainment": return <Film {...iconProps} />;
    case "utilities": return <Zap {...iconProps} />;
    case "shopping": return <ShoppingBag {...iconProps} />;
    case "health": return <Heart {...iconProps} />;
    case "education": return <GraduationCap {...iconProps} />;
    case "transfer": return <ArrowRightLeft {...iconProps} />;
    default: return <MoreHorizontal {...iconProps} />;
  }
};

export function TransactionList({
  transactions,
  accounts,
}: {
  transactions: TransactionWithRelations[];
  accounts: Tables<"accounts">[];
}) {
  const router = useRouter();
  const [filters, setFilters] = useState<FilterState>({
    account: "all",
    currency: "all",
    category: "all",
    month: "all",
  });
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
    if (filters.account !== "all" && tx.account_id !== filters.account) return false;
    if (filters.currency !== "all" && tx.currency !== filters.currency) return false;
    if (filters.category !== "all" && tx.category !== filters.category) return false;
    if (filters.month !== "all" && tx.transaction_date && !tx.transaction_date.startsWith(filters.month))
      return false;
    return true;
  });

  function removeFilter(key: keyof FilterState) {
    setFilters({ ...filters, [key]: "all" });
  }

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
      <div className="space-y-3 sticky top-0 z-20 bg-background/80 backdrop-blur-md -mx-4 px-4 py-3 border-b border-border/50 sm:static sm:bg-transparent sm:backdrop-blur-none sm:p-0 sm:mx-0 sm:border-0 transition-all">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          <FilterDialog
            accounts={accounts}
            months={months}
            filters={filters}
            onFilterChange={setFilters}
            categoryLabels={categoryLabels}
          />

          {/* Active Filter Pills */}
          <div className="flex items-center gap-2">
            {filters.account !== "all" && (
              <Badge variant="secondary" className="h-8 pl-2 pr-1 gap-1 whitespace-nowrap">
                {accounts.find(a => a.id === filters.account)?.name ?? "Account"}
                <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full ml-1 hover:bg-muted" onClick={() => removeFilter("account")}>
                  <X className="h-2.5 w-2.5" />
                </Button>
              </Badge>
            )}
            {filters.currency !== "all" && (
              <Badge variant="secondary" className="h-8 pl-2 pr-1 gap-1 whitespace-nowrap">
                {filters.currency}
                <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full ml-1 hover:bg-muted" onClick={() => removeFilter("currency")}>
                  <X className="h-2.5 w-2.5" />
                </Button>
              </Badge>
            )}
            {filters.category !== "all" && (
              <Badge variant="secondary" className="h-8 pl-2 pr-1 gap-1 whitespace-nowrap">
                {categoryLabels[filters.category] ?? filters.category}
                <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full ml-1 hover:bg-muted" onClick={() => removeFilter("category")}>
                  <X className="h-2.5 w-2.5" />
                </Button>
              </Badge>
            )}
            {filters.month !== "all" && (
              <Badge variant="secondary" className="h-8 pl-2 pr-1 gap-1 whitespace-nowrap">
                {filters.month}
                <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full ml-1 hover:bg-muted" onClick={() => removeFilter("month")}>
                  <X className="h-2.5 w-2.5" />
                </Button>
              </Badge>
            )}
          </div>
        </div>
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
                      <TableCell className={`whitespace-nowrap font-medium ${tx.balance_direction === "credit" ? "text-emerald-400" : "text-red-400"}`}>
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
            {filtered.map((tx, i) => {
              const symbol = currencySymbols[tx.currency] ?? "$";
              return (
                <div
                  key={tx.id}
                  className="glass-card rounded-2xl p-4 space-y-3 animate-in fade-in slide-in-from-bottom-4 fill-mode-both"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon Box */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--glass-bg-heavy)] text-primary ring-1 ring-inset ring-[var(--glass-border)]">
                      <CategoryIcon category={tx.category} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-start gap-2">
                        <p className="font-semibold text-base truncate pr-2">{tx.description}</p>
                        <p className={`font-bold shrink-0 text-base ${tx.balance_direction === "credit" ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
                          {formatAmount(tx.amount, symbol)}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {new Date(tx.transaction_date ?? "").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        {tx.accounts?.name ? ` · ${tx.accounts.name}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex flex-wrap gap-1.5">
                      {tx.is_repayment && (
                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border-blue-500/20">
                          Repayment
                        </Badge>
                      )}
                      {tx.splits.length > 0 && (
                        <Badge variant="outline" className="border-dashed">
                          Split ({tx.splits.length})
                        </Badge>
                      )}
                      {(tx.fee_lost ?? 0) > 0 && (
                        <Badge variant="destructive" className="opacity-90">
                          Fee: ${tx.fee_lost}
                        </Badge>
                      )}
                      {!tx.is_repayment && tx.splits.length === 0 && (tx.fee_lost ?? 0) === 0 && (
                        <Badge variant="secondary" className="opacity-70 font-normal">
                          {categoryLabels[tx.category] ?? tx.category}
                        </Badge>
                      )}
                    </div>

                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-8 w-8 text-muted-foreground"
                        onClick={() => setEditingTx(tx)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        disabled={deletingId === tx.id}
                        onClick={() => handleDelete(tx.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Mobile Actions Overlay (since hover doesn't exist on touch, we need accessible buttons) */}
                  <div className="grid grid-cols-2 gap-2 pt-2 mt-2 border-t border-[var(--glass-border-subtle)]">
                    <Button variant="ghost" className="h-9 justify-start text-muted-foreground" onClick={() => setEditingTx(tx)}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button variant="ghost" className="h-9 justify-end text-muted-foreground hover:text-destructive" onClick={() => handleDelete(tx.id)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
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
