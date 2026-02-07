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

export function SplitTable({ splits }: { splits: SplitWithTransaction[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleMarkPaid(splitId: string) {
    setLoadingId(splitId);
    try {
      await markSplitAsPaid(splitId);
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

  const currencySymbols: Record<string, string> = {
    CAD: "CA$",
    TTD: "TT$",
    USD: "US$",
  };

  if (splits.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No outstanding splits.
      </p>
    );
  }

  return (
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
                    onClick={() => handleMarkPaid(split.id)}
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
  );
}
