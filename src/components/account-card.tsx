import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/lib/supabase/types";

const categoryLabels: Record<string, string> = {
  bank: "Bank",
  credit_card: "Credit Card",
  third_party: "Third Party",
};

const currencySymbols: Record<string, string> = {
  CAD: "CA$",
  TTD: "TT$",
  USD: "US$",
};

export function AccountCard({ account }: { account: Tables<"accounts"> }) {
  const symbol = currencySymbols[account.currency] ?? "$";
  const balance = account.current_balance ?? 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{account.name}</CardTitle>
        <Badge variant="secondary">{categoryLabels[account.category]}</Badge>
      </CardHeader>
      <CardContent>
        {account.category === "credit_card" ? (
          <div className="text-sm text-muted-foreground">Spending tracker</div>
        ) : (
          <>
            <div className="text-2xl font-bold">
              {symbol}
              {balance.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground">{account.currency}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
