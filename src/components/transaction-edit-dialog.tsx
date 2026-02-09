"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTransaction } from "@/lib/actions/transactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";

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

interface TransactionEditDialogProps {
  transaction: {
    id: string;
    description: string;
    amount: number;
    transaction_date: string | null;
    category: string;
    is_transfer_to_third_party: boolean | null;
    fee_lost: number | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionEditDialog({
  transaction,
  open,
  onOpenChange,
}: TransactionEditDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState(transaction.description);
  const [amount, setAmount] = useState(transaction.amount.toString());
  const [date, setDate] = useState(transaction.transaction_date ?? "");
  const [category, setCategory] = useState(transaction.category);
  const [feeLost, setFeeLost] = useState(
    (transaction.fee_lost ?? 0).toString()
  );
  const isTransfer = transaction.is_transfer_to_third_party ?? false;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("transactionId", transaction.id);
      formData.set("description", description);
      formData.set("amount", amount);
      formData.set("transaction_date", date);
      formData.set("category", category);
      if (isTransfer) {
        formData.set("fee_lost", feeLost);
      }
      await updateTransaction(formData);
      toast.success("Transaction updated");
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Input
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-amount">
              {isTransfer ? "Amount Sent (CAD)" : "Amount"}
            </Label>
            <Input
              id="edit-amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          {isTransfer && (
            <div className="space-y-2">
              <Label htmlFor="edit-fee">Transfer Fee</Label>
              <Input
                id="edit-fee"
                type="number"
                step="0.01"
                min="0"
                value={feeLost}
                onChange={(e) => setFeeLost(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Net received: ${(parseFloat(amount || "0") - parseFloat(feeLost || "0")).toFixed(2)}
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="edit-date">Date</Label>
            <Input
              id="edit-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {categoryLabels[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
