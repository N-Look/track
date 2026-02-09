"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { convert, CURRENCIES, currencySymbols } from "@/lib/currency";
import { ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CurrencyConverter() {
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState("TTD");
  const [to, setTo] = useState("CAD");

  const numAmount = parseFloat(amount) || 0;
  const converted = convert(numAmount, from, to);

  function swap() {
    setFrom(to);
    setTo(from);
  }

  return (
    <div className="glass rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">
        Currency Converter
      </h3>
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <Label className="text-xs">Amount</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="w-20 space-y-1">
          <Label className="text-xs">From</Label>
          <Select value={from} onValueChange={setFrom}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={swap}
        >
          <ArrowRightLeft className="h-4 w-4" />
        </Button>
        <div className="w-20 space-y-1">
          <Label className="text-xs">To</Label>
          <Select value={to} onValueChange={setTo}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="text-center text-lg font-bold">
        {currencySymbols[from]}
        {numAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        {" = "}
        {currencySymbols[to]}
        {converted.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </div>
    </div>
  );
}
