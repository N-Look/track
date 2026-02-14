"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { convert, CURRENCIES, currencySymbols } from "@/lib/currency";
import type { Tables } from "@/lib/supabase/types";

const categoryLabels: Record<string, string> = {
  bank: "Bank",
  credit_card: "Credit Card",
  third_party: "Third Party",
};

export function AccountCard({ account }: { account: Tables<"accounts"> }) {
  const [viewCurrency, setViewCurrency] = useState<string>(account.currency);
  const symbol = currencySymbols[account.currency] ?? "$";
  const balance = account.current_balance ?? 0;

  const showConverted = viewCurrency !== account.currency;
  const convertedBalance = showConverted
    ? convert(balance, account.currency, viewCurrency)
    : balance;
  const convertedSymbol = currencySymbols[viewCurrency] ?? "$";

  return (
    <Card className="transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:border-primary/20 cursor-pointer group">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{account.name}</CardTitle>
        <Badge variant="secondary">{categoryLabels[account.category]}</Badge>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {symbol}
          {balance.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
        {showConverted && (
          <p className="text-sm text-muted-foreground mt-0.5">
            ≈ {convertedSymbol}
            {convertedBalance.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        )}
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-muted-foreground">
            {account.category === "credit_card" ? "Total Spent" : account.currency}
          </p>
          <Select value={viewCurrency} onValueChange={setViewCurrency}>
            <SelectTrigger className="h-7 w-[85px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c === account.currency ? `${c}` : `→ ${c}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
