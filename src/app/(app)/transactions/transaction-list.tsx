"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteTransaction } from "@/lib/actions/transactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/lib/supabase/types";

interface TransactionWithRelations {
  id: string;
  description: string;
  amount: number;
  currency: string;
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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = transactions.filter((tx) => {
    if (filterAccount !== "all" && tx.account_id !== filterAccount) return false;
    if (filterCurrency !== "all" && tx.currency !== filterCurrency) return false;
    if (dateFrom && tx.transaction_date && tx.transaction_date < dateFrom)
      return false;
    if (dateTo && tx.transaction_date && tx.transaction_date > dateTo)
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
      <div className="flex flex-wrap gap-3">
        <Select value={filterAccount} onValueChange={setFilterAccount}>
          <SelectTrigger className="w-[180px]">
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
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Currency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="CAD">CAD</SelectItem>
            <SelectItem value="TTD">TTD</SelectItem>
            <SelectItem value="USD">USD</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          placeholder="From"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-[160px]"
        />
        <Input
          type="date"
          placeholder="To"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-[160px]"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          No transactions found.
        </p>
      ) : (
        <div className="rounded-md border">
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
                    <TableCell className="whitespace-nowrap font-medium">
                      {symbol}
                      {tx.amount.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
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
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={deletingId === tx.id}
                        onClick={() => handleDelete(tx.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
