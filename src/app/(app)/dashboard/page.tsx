import { createClient } from "@/lib/supabase/server";
import { AccountCard } from "@/components/account-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const currencySymbols: Record<string, string> = {
  CAD: "CA$",
  TTD: "TT$",
  USD: "US$",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: accounts }, { data: splits }, { data: recentTx }, { data: offsets }, { data: debts }] =
    await Promise.all([
      supabase.from("accounts").select("*").order("name"),
      supabase
        .from("splits")
        .select("amount_owed, transactions(currency)")
        .eq("is_paid", false),
      supabase
        .from("transactions")
        .select("*")
        .order("transaction_date", { ascending: false })
        .limit(5),
      supabase.from("offsets").select("amount, currency"),
      supabase
        .from("debts")
        .select("amount, currency")
        .eq("is_paid", false),
    ]);

  // Group accounts by currency
  const grouped = (accounts ?? []).reduce(
    (acc, account) => {
      const curr = account.currency;
      if (!acc[curr]) acc[curr] = [];
      acc[curr].push(account);
      return acc;
    },
    {} as Record<string, typeof accounts>
  );

  // Calculate totals owed per currency (net of offsets)
  const owedByCurrency: Record<string, number> = {};
  (splits ?? []).forEach((s) => {
    const currency =
      (s.transactions as { currency: string } | null)?.currency ?? "CAD";
    owedByCurrency[currency] = (owedByCurrency[currency] ?? 0) + s.amount_owed;
  });
  (offsets ?? []).forEach((o) => {
    owedByCurrency[o.currency] = (owedByCurrency[o.currency] ?? 0) - o.amount;
  });

  // Calculate totals user owes per currency
  const youOweByCurrency: Record<string, number> = {};
  (debts ?? []).forEach((d) => {
    youOweByCurrency[d.currency] = (youOweByCurrency[d.currency] ?? 0) + d.amount;
  });

  // Calculate total balances per currency (exclude credit cards)
  const totalsByCurrency: Record<string, number> = {};
  (accounts ?? []).forEach((a) => {
    if (a.category === "credit_card") return;
    totalsByCurrency[a.currency] =
      (totalsByCurrency[a.currency] ?? 0) + (a.current_balance ?? 0);
  });

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(totalsByCurrency).map(([currency, total]) => (
          <Card key={currency}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total {currency}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {currencySymbols[currency] ?? "$"}
                {total.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </CardContent>
          </Card>
        ))}
        {Object.entries(owedByCurrency).map(([currency, total]) => (
          <Card key={`owed-${currency}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Owed to You ({currency})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {currencySymbols[currency] ?? "$"}
                {total.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </CardContent>
          </Card>
        ))}
        {Object.entries(youOweByCurrency).map(([currency, total]) => (
          <Card key={`youowe-${currency}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                You Owe ({currency})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {currencySymbols[currency] ?? "$"}
                {total.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Accounts by currency */}
      {Object.entries(grouped).map(([currency, accts]) => (
        <div key={currency}>
          <h2 className="mb-4 text-xl font-semibold">{currency} Accounts</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accts!.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        </div>
      ))}

      {(accounts ?? []).length === 0 && (
        <p className="text-muted-foreground">
          No accounts yet. Go to Accounts to add one.
        </p>
      )}

      <Separator />

      {/* Recent transactions */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Recent Transactions</h2>
        {(recentTx ?? []).length === 0 ? (
          <p className="text-muted-foreground">No transactions yet.</p>
        ) : (
          <div className="space-y-2">
            {recentTx!.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-md border px-4 py-3"
              >
                <div>
                  <p className="font-medium">{tx.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {tx.transaction_date}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {currencySymbols[tx.currency] ?? "$"}
                    {tx.amount.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                  {tx.is_repayment && (
                    <span className="text-xs text-blue-600">Repayment</span>
                  )}
                  {(tx.fee_lost ?? 0) > 0 && (
                    <span className="text-xs text-orange-600">
                      {" "}
                      Fee: ${tx.fee_lost}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
