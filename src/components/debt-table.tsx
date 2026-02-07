"use client";

import { useRouter } from "next/navigation";
import { markDebtAsPaid, deleteDebt } from "@/lib/actions/debts";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import type { Tables } from "@/lib/supabase/types";

const currencySymbols: Record<string, string> = {
  CAD: "CA$",
  TTD: "TT$",
  USD: "US$",
};

export function DebtTable({ debts }: { debts: Tables<"debts">[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleMarkPaid(debtId: string) {
    setLoadingId(debtId);
    try {
      await markDebtAsPaid(debtId);
      toast.success("Marked as paid");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to mark as paid"
      );
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDelete(id: string) {
    setLoadingId(id);
    try {
      await deleteDebt(id);
      toast.success("Debt deleted");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setLoadingId(null);
    }
  }

  if (debts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No debts recorded.
      </p>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Amount</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {debts.map((debt) => {
              const symbol = currencySymbols[debt.currency] ?? "$";
              return (
                <TableRow key={debt.id}>
                  <TableCell>
                    {symbol}
                    {debt.amount.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                    <span className="ml-1 text-xs text-muted-foreground">
                      {debt.currency}
                    </span>
                  </TableCell>
                  <TableCell>{debt.description ?? "—"}</TableCell>
                  <TableCell>
                    {debt.created_at
                      ? new Date(debt.created_at).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {debt.is_paid ? (
                      <Badge variant="secondary">Paid</Badge>
                    ) : (
                      <Badge variant="destructive">Unpaid</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {!debt.is_paid && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={loadingId === debt.id}
                          onClick={() => handleMarkPaid(debt.id)}
                        >
                          <Check className="mr-1 h-3 w-3" />
                          {loadingId === debt.id ? "..." : "Mark Paid"}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={loadingId === debt.id}
                        onClick={() => handleDelete(debt.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
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
        {debts.map((debt) => {
          const symbol = currencySymbols[debt.currency] ?? "$";
          return (
            <div
              key={debt.id}
              className="rounded-lg border p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="text-lg font-bold">
                  {symbol}
                  {debt.amount.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    {debt.currency}
                  </span>
                </div>
                {debt.is_paid ? (
                  <Badge variant="secondary">Paid</Badge>
                ) : (
                  <Badge variant="destructive">Unpaid</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {debt.description ?? "—"}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {debt.created_at
                    ? new Date(debt.created_at).toLocaleDateString()
                    : "—"}
                </span>
                <div className="flex gap-1">
                  {!debt.is_paid && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={loadingId === debt.id}
                      onClick={() => handleMarkPaid(debt.id)}
                    >
                      <Check className="mr-1 h-3 w-3" />
                      {loadingId === debt.id ? "..." : "Mark Paid"}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={loadingId === debt.id}
                    onClick={() => handleDelete(debt.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
