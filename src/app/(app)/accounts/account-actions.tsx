"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createAccount,
  updateAccount,
  deleteAccount,
  updateAccountBalance,
} from "@/lib/actions/accounts";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Plus, MoreVertical, Pencil, Trash2, DollarSign } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/lib/supabase/types";

export function AccountActions({ account }: { account?: Tables<"accounts"> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<string>(account?.category ?? "bank");
  const [currency, setCurrency] = useState<string>(account?.currency ?? "CAD");
  const [excludeFromTotals, setExcludeFromTotals] = useState(account?.exclude_from_totals ?? false);
  const [newBalance, setNewBalance] = useState<string>("");

  const isEdit = !!account;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      formData.set("category", category);
      formData.set("currency", currency);
      formData.set("exclude_from_totals", excludeFromTotals.toString());

      if (isEdit) {
        await updateAccount(account.id, formData);
        toast.success("Account updated");
      } else {
        await createAccount(formData);
        toast.success("Account created");
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!account) return;
    try {
      await deleteAccount(account.id);
      toast.success("Account deleted");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  async function handleSetBalance(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return;
    setLoading(true);
    try {
      await updateAccountBalance(account.id, parseFloat(newBalance));
      toast.success("Balance updated");
      setBalanceOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update balance");
    } finally {
      setLoading(false);
    }
  }

  // For existing accounts, show edit/delete dropdown
  if (isEdit) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {account.category !== "credit_card" && (
              <DropdownMenuItem
                onClick={() => {
                  setNewBalance(String(account.current_balance ?? 0));
                  setBalanceOpen(true);
                }}
              >
                <DollarSign className="mr-2 h-4 w-4" />
                Set Balance
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Account</DialogTitle>
            </DialogHeader>
            <AccountForm
              defaultName={account.name}
              category={category}
              setCategory={setCategory}
              currency={currency}
              setCurrency={setCurrency}
              excludeFromTotals={excludeFromTotals}
              setExcludeFromTotals={setExcludeFromTotals}
              loading={loading}
              onSubmit={handleSubmit}
              submitLabel="Save"
            />
          </DialogContent>
        </Dialog>

        <Dialog open={balanceOpen} onOpenChange={setBalanceOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Balance — {account.name}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSetBalance} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-balance">New Balance ({account.currency})</Label>
                <Input
                  id="new-balance"
                  type="number"
                  step="0.01"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Saving..." : "Set Balance"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // For new accounts, show Add button
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Account
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Account</DialogTitle>
        </DialogHeader>
        <AccountForm
          category={category}
          setCategory={setCategory}
          currency={currency}
          setCurrency={setCurrency}
          excludeFromTotals={excludeFromTotals}
          setExcludeFromTotals={setExcludeFromTotals}
          loading={loading}
          onSubmit={handleSubmit}
          submitLabel="Create"
        />
      </DialogContent>
    </Dialog>
  );
}

function AccountForm({
  defaultName,
  category,
  setCategory,
  currency,
  setCurrency,
  excludeFromTotals,
  setExcludeFromTotals,
  loading,
  onSubmit,
  submitLabel,
}: {
  defaultName?: string;
  category: string;
  setCategory: (v: string) => void;
  currency: string;
  setCurrency: (v: string) => void;
  excludeFromTotals: boolean;
  setExcludeFromTotals: (v: boolean) => void;
  loading: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={defaultName} required />
      </div>
      <div className="space-y-2">
        <Label>Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bank">Bank</SelectItem>
            <SelectItem value="credit_card">Credit Card</SelectItem>
            <SelectItem value="third_party">Third Party</SelectItem>
          </SelectContent>
        </Select>
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
      <div className="flex items-center justify-between rounded-xl border border-border/50 p-3">
        <div>
          <Label htmlFor="exclude-totals" className="cursor-pointer">Exclude from totals</Label>
          <p className="text-xs text-muted-foreground">Hide this account from dashboard total balance</p>
        </div>
        <Switch
          id="exclude-totals"
          checked={excludeFromTotals}
          onCheckedChange={setExcludeFromTotals}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
