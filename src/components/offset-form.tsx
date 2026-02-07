"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createOffset } from "@/lib/actions/offsets";
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

export function OffsetForm({
  debtors,
  defaultDebtor,
}: {
  debtors: string[];
  defaultDebtor?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [debtor, setDebtor] = useState(defaultDebtor ?? "");
  const [currency, setCurrency] = useState("CAD");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      formData.set("debtor_name", debtor);
      formData.set("currency", currency);
      await createOffset(formData);
      toast.success("Offset recorded");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create offset");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Offset
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Offset Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="offset-debtor">Person</Label>
            {debtors.length > 0 ? (
              <Select value={debtor} onValueChange={setDebtor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent>
                  {debtors.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="offset-debtor"
                value={debtor}
                onChange={(e) => setDebtor(e.target.value)}
                required
              />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="offset-amount">Amount</Label>
            <Input
              id="offset-amount"
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
            <Label htmlFor="offset-desc">Description (optional)</Label>
            <Input id="offset-desc" name="description" />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !debtor}>
            {loading ? "Saving..." : "Record Offset"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
