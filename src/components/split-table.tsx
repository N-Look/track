"use client";

import { useRouter } from "next/navigation";
import { markSplitAsPaid } from "@/lib/actions/splits";
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
import { Check } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface SplitWithTransaction {
  id: string;
  debtor_name: string;
  amount_owed: number;
  is_paid: boolean | null;
  paid_at: string | null;
  transaction_id: string | null;
  transactions: {
    description: string;
    transaction_date: string | null;
    currency: string;
    account_id: string | null;
  } | null;
}

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

export function SplitTable({
  splits,
  accounts,
}: {
  splits: SplitWithTransaction[];
  accounts: Account[];
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [dialogSplit, setDialogSplit] = useState<SplitWithTransaction | null>(
    null
  );
  const [selectedAccountId, setSelectedAccountId] = useState<string>("none");

  function openDialog(split: SplitWithTransaction) {
    setDialogSplit(split);
    setSelectedAccountId("none");
  }

  async function handleConfirmPaid() {
    if (!dialogSplit) return;
    const splitId = dialogSplit.id;
    setLoadingId(splitId);
    setDialogSplit(null);
    try {
      const accountId =
        selectedAccountId === "none" ? null : selectedAccountId;
      await markSplitAsPaid(splitId, accountId);
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

  if (splits.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No outstanding splits.
      </p>
    );
  }

  const splitCurrency = dialogSplit?.transactions?.currency ?? "CAD";
  const matchingAccounts = accounts.filter(
    (a) => a.currency === splitCurrency
  );

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Debtor</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {splits.map((split) => {
              const currency = split.transactions?.currency ?? "CAD";
              const symbol = currencySymbols[currency] ?? "$";
              return (
                <TableRow key={split.id}>
                  <TableCell className="font-medium">
                    {split.debtor_name}
                  </TableCell>
                  <TableCell>
                    {symbol}
                    {split.amount_owed.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell>
                    {split.transactions?.description ?? "—"}
                  </TableCell>
                  <TableCell>
                    {split.transactions?.transaction_date ?? "—"}
                  </TableCell>
                  <TableCell>
                    {split.is_paid ? (
                      <Badge variant="secondary">Paid</Badge>
                    ) : (
                      <Badge variant="destructive">Unpaid</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {!split.is_paid && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={loadingId === split.id}
                        onClick={() => openDialog(split)}
                      >
                        <Check className="mr-1 h-3 w-3" />
                        {loadingId === split.id ? "..." : "Mark Paid"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {splits.map((split) => {
          const currency = split.transactions?.currency ?? "CAD";
          const symbol = currencySymbols[currency] ?? "$";
          return (
            <div
              key={split.id}
              className="rounded-lg border p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{split.debtor_name}</span>
                {split.is_paid ? (
                  <Badge variant="secondary">Paid</Badge>
                ) : (
                  <Badge variant="destructive">Unpaid</Badge>
                )}
              </div>
              <div className="text-lg font-bold">
                {symbol}
                {split.amount_owed.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </div>
              <p className="text-sm text-muted-foreground">
                {split.transactions?.description ?? "—"}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {split.transactions?.transaction_date ?? "—"}
                </span>
                {!split.is_paid && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loadingId === split.id}
                    onClick={() => openDialog(split)}
                  >
                    <Check className="mr-1 h-3 w-3" />
                    {loadingId === split.id ? "..." : "Mark Paid"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog
        open={dialogSplit !== null}
        onOpenChange={(open) => {
          if (!open) setDialogSplit(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>How were you paid?</DialogTitle>
          </DialogHeader>
          {dialogSplit && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {dialogSplit.debtor_name} owes{" "}
                {currencySymbols[splitCurrency] ?? "$"}
                {dialogSplit.amount_owed.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
                {" "}for &ldquo;{dialogSplit.transactions?.description ?? "—"}&rdquo;
              </p>
              <div className="space-y-2">
                <Label>Deposit into account</Label>
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
