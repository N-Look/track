"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { settleUp } from "@/lib/actions/settlements";
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
import { Handshake, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/lib/supabase/types";

type CurrencyType = Database["public"]["Enums"]["currency_type"];

const currencySymbols: Record<string, string> = {
  CAD: "CA$",
  TTD: "TT$",
  USD: "US$",
};

interface Account {
  id: string;
  name: string;
  currency: CurrencyType;
  category: string;
}

export function SettleDialog({
  personName,
  netByCurrency,
  accounts,
  splits = [],
  debts = [],
}: {
  personName: string;
  netByCurrency: Record<string, number>;
  accounts: Account[];
  splits?: any[];
  debts?: any[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState(
    Object.keys(netByCurrency)[0] ?? "CAD"
  );
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  
  // Track manually selected items
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  const netAmount = netByCurrency[selectedCurrency] ?? 0;
  const direction = netAmount > 0 ? "they_pay" : "you_pay";
  const absAmount = Math.abs(netAmount);

  // Filter items to current currency
  const availableSplits = splits.filter((s) => (s.transactions?.currency ?? "CAD") === selectedCurrency);
  const availableDebts = debts.filter((d) => d.currency === selectedCurrency);

  const parsedAmount = parseFloat(amount || "0");
  const isPartial = parsedAmount > 0 && parsedAmount < absAmount;
  const isFull = parsedAmount === absAmount;
  const isOver = parsedAmount > absAmount;
  const isInvalid = parsedAmount <= 0 || isNaN(parsedAmount);

  const remaining = absAmount - parsedAmount;

  const matchingAccounts = accounts.filter(
    (a) => a.currency === selectedCurrency
  );

  function handleOpen(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen) {
      const curr = Object.keys(netByCurrency)[0] ?? "CAD";
      setSelectedCurrency(curr);
      setAmount(Math.abs(netByCurrency[curr] ?? 0).toFixed(2));
      setAccountId("");
      setSelectedItemIds(new Set());
    }
  }

  // Handle currency switch
  function handleCurrencyChange(v: string) {
    setSelectedCurrency(v);
    setAmount(Math.abs(netByCurrency[v] ?? 0).toFixed(2));
    setAccountId("");
    setSelectedItemIds(new Set());
  }

  // Handle checkbox toggle
  function toggleItem(id: string, itemAmount: number) {
    const newSet = new Set(selectedItemIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedItemIds(newSet);
    
    // Automatically recalculate amount based on newly selected items
    // Only if we actually have items selected, otherwise we revert to full amount or zero
    if (newSet.size > 0) {
      let sum = 0;
      if (direction === "they_pay") {
        availableSplits.forEach(s => { if (newSet.has(s.id)) sum += s.amount_owed; });
      } else {
        availableDebts.forEach(d => { if (newSet.has(d.id)) sum += d.amount; });
      }
      setAmount(sum.toFixed(2));
    } else {
      // If nothing selected, maybe reset to total
      setAmount(Math.abs(netByCurrency[selectedCurrency] ?? 0).toFixed(2));
    }
  }

  async function handleSettle() {
    if (!accountId || isInvalid) return;
    setLoading(true);
    try {
      await settleUp(
        personName,
        accountId,
        selectedCurrency as CurrencyType,
        parsedAmount,
        direction as "they_pay" | "you_pay",
        selectedItemIds.size > 0 ? Array.from(selectedItemIds) : undefined
      );
      toast.success(
        isPartial
          ? `Partial payment recorded with ${personName}`
          : `Settled with ${personName}`
      );
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Settlement failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Handshake className="h-3.5 w-3.5" />
          Settle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settle with {personName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="glass-light rounded-xl p-3 space-y-1">
            {Object.entries(netByCurrency).map(([currency, net]) => (
              <div key={currency} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{currency}</span>
                <span
                  className={`font-medium ${
                    net > 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-orange-600 dark:text-orange-400"
                  }`}
                >
                  {net > 0 ? "+" : "\u2212"}
                  {currencySymbols[currency] ?? "$"}
                  {Math.abs(net).toFixed(2)}
                  <span className="ml-1 text-xs text-muted-foreground">
                    {net > 0 ? "owes you" : "you owe"}
                  </span>
                </span>
              </div>
            ))}
          </div>

          {Object.keys(netByCurrency).length > 1 && (
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={selectedCurrency}
                onValueChange={handleCurrencyChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(netByCurrency).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Itemized Checkboxes */}
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            <Label>Select specific items to settle (optional)</Label>
            {direction === "they_pay" && availableSplits.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {availableSplits.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-start gap-2 text-sm p-2 rounded-lg border bg-background/50 hover:bg-accent/50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedItemIds.has(s.id)}
                      onChange={() => toggleItem(s.id, s.amount_owed)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary bg-background"
                    />
                    <div className="flex-1 flex justify-between gap-2">
                      <span className="text-muted-foreground line-clamp-1">{s.transactions?.description || "Split"}</span>
                      <span className="font-medium text-green-600">+{currencySymbols[selectedCurrency]}{Number(s.amount_owed).toFixed(2)}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}
            
            {direction === "you_pay" && availableDebts.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {availableDebts.map((d) => (
                  <label
                    key={d.id}
                    className="flex items-start gap-2 text-sm p-2 rounded-lg border bg-background/50 hover:bg-accent/50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedItemIds.has(d.id)}
                      onChange={() => toggleItem(d.id, d.amount)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary bg-background"
                    />
                    <div className="flex-1 flex justify-between gap-2">
                      <span className="text-muted-foreground line-clamp-1">{d.description || "Debt"}</span>
                      <span className="font-medium text-orange-600">-{currencySymbols[selectedCurrency]}{Number(d.amount).toFixed(2)}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Amount</Label>
              <button
                type="button"
                onClick={() => {
                  setAmount(absAmount.toFixed(2));
                  setSelectedItemIds(new Set()); // Reset selections if they override
                }}
                className="text-xs text-primary hover:underline font-medium"
              >
                Use full {currencySymbols[selectedCurrency]}{absAmount.toFixed(2)}
              </button>
            </div>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`0.00`}
            />
            {isPartial && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Partial payment &mdash; {currencySymbols[selectedCurrency]}
                  {remaining.toFixed(2)} will remain outstanding
                </span>
              </div>
            )}
            {isFull && (
              <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>Full balance will be settled</span>
              </div>
            )}
            {isOver && (
              <div className="flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Amount exceeds outstanding balance by {currencySymbols[selectedCurrency]}
                  {Math.abs(remaining).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>
              {direction === "they_pay"
                ? "Receive into account"
                : "Pay from account"}
            </Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {matchingAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleSettle}
            className="w-full"
            disabled={loading || !accountId || isInvalid}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Settling...
              </>
            ) : direction === "they_pay" ? (
              isPartial
                ? `Record ${currencySymbols[selectedCurrency]}${parsedAmount.toFixed(2)} partial payment`
                : `Receive ${currencySymbols[selectedCurrency]}${parsedAmount.toFixed(2)}`
            ) : (
              isPartial
                ? `Record ${currencySymbols[selectedCurrency]}${parsedAmount.toFixed(2)} partial payment`
                : `Pay ${currencySymbols[selectedCurrency]}${parsedAmount.toFixed(2)}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
