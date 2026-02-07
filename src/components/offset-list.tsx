"use client";

import { useRouter } from "next/navigation";
import { deleteOffset } from "@/lib/actions/offsets";
import { Button } from "@/components/ui/button";
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
import { useState } from "react";
import type { Tables } from "@/lib/supabase/types";

const currencySymbols: Record<string, string> = {
  CAD: "CA$",
  TTD: "TT$",
  USD: "US$",
};

export function OffsetList({ offsets }: { offsets: Tables<"offsets">[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setLoadingId(id);
    try {
      await deleteOffset(id);
      toast.success("Offset deleted");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setLoadingId(null);
    }
  }

  if (offsets.length === 0) return null;

  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium text-muted-foreground mb-2">Offsets</h4>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Amount</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Date</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {offsets.map((offset) => {
            const symbol = currencySymbols[offset.currency] ?? "$";
            return (
              <TableRow key={offset.id}>
                <TableCell>
                  {symbol}
                  {offset.amount.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                  <span className="ml-1 text-xs text-muted-foreground">
                    {offset.currency}
                  </span>
                </TableCell>
                <TableCell>{offset.description ?? "—"}</TableCell>
                <TableCell>
                  {offset.created_at
                    ? new Date(offset.created_at).toLocaleDateString()
                    : "—"}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={loadingId === offset.id}
                    onClick={() => handleDelete(offset.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
