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

  const [{ data: accounts }, { data: splits }, { data: recentTx }, { data: debts }] =
    await Promise.all([
      supabase.from("accounts").select("*").order("name"),
      supabase
        .from("splits")
        .select("amount_owed, debtor_name, transactions(currency)")
        .eq("is_paid", false),
      supabase
        .from("transactions")
        .select("*")
        .order("transaction_date", { ascending: false })
        .limit(5),
      supabase
        .from("debts")
        .select("amount, currency, creditor_name")
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

  // Calculate per-person net balances
  const personBalances: Record<string, Record<string, number>> = {};

  (splits ?? []).forEach((s) => {
    const name = s.debtor_name;
    const currency =
      (s.transactions as { currency: string } | null)?.currency ?? "CAD";
    if (!personBalances[name]) personBalances[name] = {};
    personBalances[name][currency] =
      (personBalances[name][currency] ?? 0) + s.amount_owed;
  });

  (debts ?? []).forEach((d) => {
    const name = d.creditor_name;
    if (!personBalances[name]) personBalances[name] = {};
    personBalances[name][d.currency] =
      (personBalances[name][d.currency] ?? 0) - d.amount;
  });

  const sortedPeople = Object.keys(personBalances).sort();

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
        {sortedPeople.map((name) => {
          const nets = Object.values(personBalances[name]);
          const totalNet = nets.reduce((a, b) => a + b, 0);
          const isPositive = totalNet > 0;
          const isNegative = totalNet < 0;
          return (
          <div
            key={`person-${name}`}
            className={`glass rounded-2xl p-4 flex items-center gap-4 ${
              isPositive ? "glow-positive" : isNegative ? "glow-negative" : ""
            }`}
          >
            <div
              className={`flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                isPositive
                  ? "bg-green-500/15 text-green-600 dark:text-green-400 ring-1 ring-green-500/30"
                  : isNegative
                    ? "bg-orange-500/15 text-orange-600 dark:text-orange-400 ring-1 ring-orange-500/30"
                    : "bg-[var(--glass-bg-light)] text-muted-foreground ring-1 ring-[var(--glass-border)]"
              }`}
            >
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate">{name}</p>
              <div className="mt-0.5 space-y-0.5">
                {Object.entries(personBalances[name]).map(([currency, net]) => (
                  <div key={currency} className="flex items-baseline gap-1.5">
                    <span
                      className={`text-lg font-bold tabular-nums ${
                        net > 0
                          ? "text-green-600 dark:text-green-400"
                          : net < 0
                            ? "text-orange-600 dark:text-orange-400"
                            : "text-muted-foreground"
                      }`}
                    >
                      {net > 0 ? "+" : net < 0 ? "\u2212" : ""}
                      {currencySymbols[currency] ?? "$"}
                      {Math.abs(net).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {net > 0 ? "owes you" : net < 0 ? "you owe" : "settled"}
                      {" "}({currency})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          );
        })}
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
                className="glass flex items-center justify-between rounded-xl px-4 py-3"
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
