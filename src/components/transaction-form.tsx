"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTransaction } from "@/lib/actions/transactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/lib/supabase/types";

interface SplitRow {
  debtor_name: string;
  amount_owed: string;
}

export function TransactionForm({
  accounts,
}: {
  accounts: Tables<"accounts">[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [isRepayment, setIsRepayment] = useState(false);
  const [isTransfer, setIsTransfer] = useState(false);
  const [hasSplits, setHasSplits] = useState(false);
  const [splits, setSplits] = useState<SplitRow[]>([]);
  const [amountSent, setAmountSent] = useState("");
  const [netReceived, setNetReceived] = useState("");

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const feeLost =
    isTransfer && amountSent && netReceived
      ? (parseFloat(amountSent) - parseFloat(netReceived)).toFixed(2)
      : "0.00";

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

  function resetForm() {
    setAccountId("");
    setIsRepayment(false);
    setIsTransfer(false);
    setHasSplits(false);
    setSplits([]);
    setAmountSent("");
    setNetReceived("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);

      formData.set("account_id", accountId);
      formData.set("is_repayment", isRepayment.toString());
      formData.set("is_transfer_to_third_party", isTransfer.toString());
      formData.set("currency", selectedAccount?.currency ?? "CAD");

      if (isTransfer) {
        formData.set("amount", amountSent);
        formData.set("fee_lost", feeLost);
      }

      if (hasSplits && splits.length > 0) {
        const validSplits = splits
          .filter((s) => s.debtor_name && s.amount_owed)
          .map((s) => ({
            debtor_name: s.debtor_name,
            amount_owed: parseFloat(s.amount_owed),
          }));
        formData.set("splits", JSON.stringify(validSplits));
      }

      await createTransaction(formData);
      toast.success("Transaction created");
      setOpen(false);
      resetForm();
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create transaction"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Account</Label>
            <Select value={accountId} onValueChange={setAccountId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} ({a.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transaction_date">Date</Label>
            <Input
              id="transaction_date"
              name="transaction_date"
              type="date"
              defaultValue={new Date().toISOString().split("T")[0]}
            />
          </div>

          {/* Mode toggles */}
          <div className="space-y-3 glass-light rounded-xl p-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="repayment">Repayment</Label>
              <Switch
                id="repayment"
                checked={isRepayment}
                onCheckedChange={(v) => {
                  setIsRepayment(v);
                  if (v) setIsTransfer(false);
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="transfer">Third-Party Transfer</Label>
              <Switch
                id="transfer"
                checked={isTransfer}
                onCheckedChange={(v) => {
                  setIsTransfer(v);
                  if (v) setIsRepayment(false);
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="split">Split with others</Label>
              <Switch
                id="split"
                checked={hasSplits}
                onCheckedChange={setHasSplits}
              />
            </div>
          </div>

          {/* Amount field(s) */}
          {isTransfer ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="amount_sent">Amount Sent (CAD)</Label>
                <Input
                  id="amount_sent"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountSent}
                  onChange={(e) => setAmountSent(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="net_received">Net Received (USD)</Label>
                <Input
                  id="net_received"
                  type="number"
                  step="0.01"
                  min="0"
                  value={netReceived}
                  onChange={(e) => setNetReceived(e.target.value)}
                  required
                />
              </div>
              <div className="glass-light rounded-lg p-2 text-sm">
                Fee Lost: <strong>${feeLost}</strong>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                required
              />
            </div>
          )}

          {/* Split rows */}
          {hasSplits && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Splits</Label>
                <Button type="button" variant="outline" size="sm" onClick={addSplit}>
                  <Plus className="mr-1 h-3 w-3" />
                  Add Person
                </Button>
              </div>
              {splits.map((split, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder="Name"
                    value={split.debtor_name}
                    onChange={(e) => updateSplit(i, "debtor_name", e.target.value)}
                  />
                  <Input
                    placeholder="Amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={split.amount_owed}
                    onChange={(e) =>
                      updateSplit(i, "amount_owed", e.target.value)
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSplit(i)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading || !accountId}>
            {loading ? "Creating..." : "Create Transaction"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
