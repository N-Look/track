"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createDebt } from "@/lib/actions/debts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus } from "lucide-react";
import { toast } from "sonner";

export function DebtForm({
  creditors,
  defaultCreditor,
}: {
  creditors: string[];
  defaultCreditor?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creditor, setCreditor] = useState(defaultCreditor ?? "");
  const [useNewCreditor, setUseNewCreditor] = useState(creditors.length === 0);
  const [currency, setCurrency] = useState("CAD");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      formData.set("creditor_name", creditor);
      formData.set("currency", currency);
      await createDebt(formData);
      toast.success("Debt recorded");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create debt");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Debt
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Debt</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="debt-creditor">Person I Owe</Label>
            {!useNewCreditor && creditors.length > 0 ? (
              <div className="space-y-2">
                <Select value={creditor} onValueChange={setCreditor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select person" />
                  </SelectTrigger>
                  <SelectContent>
                    {creditors.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setUseNewCreditor(true);
                    setCreditor("");
                  }}
                >
                  + New person
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  id="debt-creditor"
                  value={creditor}
                  onChange={(e) => setCreditor(e.target.value)}
                  placeholder="Enter name"
                  required
                />
                {creditors.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setUseNewCreditor(false);
                      setCreditor(defaultCreditor ?? "");
                    }}
                  >
                    Choose existing
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="debt-amount">Amount</Label>
            <Input
              id="debt-amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CAD">CAD</SelectItem>
                <SelectItem value="TTD">TTD</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="debt-desc">Description (optional)</Label>
            <Input id="debt-desc" name="description" />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !creditor}>
            {loading ? "Saving..." : "Record Debt"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
