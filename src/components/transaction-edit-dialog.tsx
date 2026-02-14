"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTransaction, updateTransactionSplits } from "@/lib/actions/transactions";
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
import { Plus, Trash2 } from "lucide-react";
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

interface SplitRow {
  debtor_name: string;
  amount_owed: string;
}

interface TransactionEditDialogProps {
  transaction: {
    id: string;
    description: string;
    amount: number;
    currency: string;
    transaction_date: string | null;
    category: string;
    is_transfer_to_third_party: boolean | null;
    fee_lost: number | null;
    splits: { id: string; debtor_name: string; amount_owed: number; is_paid: boolean | null }[];
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

  const [splits, setSplits] = useState<SplitRow[]>(
    transaction.splits.length > 0
      ? transaction.splits.map((s) => ({
          debtor_name: s.debtor_name,
          amount_owed: s.amount_owed.toString(),
        }))
      : []
  );

  function addSplit() {
    setSplits([...splits, { debtor_name: "", amount_owed: "" }]);
  }

  function removeSplit(index: number) {
    setSplits(splits.filter((_, i) => i !== index));
  }

  function updateSplit(index: number, field: keyof SplitRow, value: string) {
    const updated = [...splits];
    updated[index] = { ...updated[index], [field]: value };
    setSplits(updated);
  }

  function splitEvenly() {
    if (splits.length === 0) return;
    const total = Math.abs(parseFloat(amount || "0"));
    const perPerson = Math.floor((total / (splits.length + 1)) * 100) / 100;
    const remainder = Math.round((total - perPerson * (splits.length + 1)) * 100) / 100;
    setSplits(
      splits.map((s, i) => ({
        ...s,
        amount_owed: (perPerson + (i === 0 ? remainder : 0)).toFixed(2),
      }))
    );
  }

  const splitTotal = splits.reduce(
    (sum, s) => sum + (parseFloat(s.amount_owed) || 0),
    0
  );

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

      // Update splits
      const validSplits = splits
        .filter((s) => s.debtor_name.trim() && parseFloat(s.amount_owed) > 0)
        .map((s) => ({
          debtor_name: s.debtor_name.trim(),
          amount_owed: parseFloat(s.amount_owed),
        }));
      await updateTransactionSplits(transaction.id, validSplits);

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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
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

          {/* Splits section */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label>Splits</Label>
              <div className="flex gap-2">
                {splits.length > 0 && (
                  <Button type="button" variant="outline" size="sm" onClick={splitEvenly}>
                    Split evenly
                  </Button>
                )}
                <Button type="button" variant="outline" size="sm" onClick={addSplit}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add person
                </Button>
              </div>
            </div>
            {splits.map((split, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  placeholder="Name"
                  value={split.debtor_name}
                  onChange={(e) => updateSplit(i, "debtor_name", e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Amount"
                  value={split.amount_owed}
                  onChange={(e) => updateSplit(i, "amount_owed", e.target.value)}
                  className="w-24"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => removeSplit(i)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {splits.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Split total: ${splitTotal.toFixed(2)} of ${Math.abs(parseFloat(amount || "0")).toFixed(2)}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
