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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import type { Tables } from "@/lib/supabase/types";

interface Account {
  id: string;
  name: string;
  currency: string;
  category: string;
}

const currencySymbols: Record<string, string> = {
  CAD: "CA$",
  TTD: "TT$",
  USD: "US$",
};

export function DebtTable({
  debts,
  accounts,
}: {
  debts: Tables<"debts">[];
  accounts: Account[];
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [dialogDebt, setDialogDebt] = useState<Tables<"debts"> | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("none");

  function openDialog(debt: Tables<"debts">) {
    setDialogDebt(debt);
    setSelectedAccountId("none");
  }

  async function handleConfirmPaid() {
    if (!dialogDebt) return;
    const debtId = dialogDebt.id;
    setLoadingId(debtId);
    setDialogDebt(null);
    try {
      const accountId =
        selectedAccountId === "none" ? null : selectedAccountId;
      await markDebtAsPaid(debtId, accountId);
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

  const debtCurrency = dialogDebt?.currency ?? "CAD";
  const matchingAccounts = accounts.filter(
    (a) => a.currency === debtCurrency
  );

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
                          onClick={() => openDialog(debt)}
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
              className="glass rounded-xl p-4 space-y-2"
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
                      onClick={() => openDialog(debt)}
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

      <Dialog
        open={dialogDebt !== null}
        onOpenChange={(open) => {
          if (!open) setDialogDebt(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>How did you pay?</DialogTitle>
          </DialogHeader>
          {dialogDebt && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You owe {dialogDebt.creditor_name}{" "}
                {currencySymbols[debtCurrency] ?? "$"}
                {dialogDebt.amount.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
                {" "}for &ldquo;{dialogDebt.description ?? "—"}&rdquo;
              </p>
              <div className="space-y-2">
                <Label>Pay from account</Label>
                <Select
                  value={selectedAccountId}
                  onValueChange={setSelectedAccountId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      No account (cash, etc.)
                    </SelectItem>
                    {matchingAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={handleConfirmPaid}
              >
                Confirm Paid
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
