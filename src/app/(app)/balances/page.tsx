import { createClient } from "@/lib/supabase/server";
import { SplitTable } from "@/components/split-table";
import { DebtForm } from "@/components/debt-form";
import { DebtTable } from "@/components/debt-table";
import { SettleDialog } from "@/components/settle-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const currencySymbols: Record<string, string> = {
  CAD: "CA$",
  TTD: "TT$",
  USD: "US$",
};

export default async function BalancesPage() {
  const supabase = await createClient();

  const [{ data: splits }, { data: debts }, { data: accounts }] =
    await Promise.all([
      supabase
        .from("splits")
        .select(
          "*, transactions(description, transaction_date, currency, account_id)"
        )
        .eq("is_paid", false)
        .order("debtor_name"),
      supabase
        .from("debts")
        .select("*")
        .eq("is_paid", false)
        .order("created_at", { ascending: false }),
      supabase.from("accounts").select("id, name, currency, category").order("name"),
    ]);

  const unpaidSplits = splits ?? [];
  const unpaidDebts = debts ?? [];

  // Group splits by debtor (they owe you)
  const splitsByPerson: Record<string, typeof unpaidSplits> = {};
  unpaidSplits.forEach((s) => {
    if (!splitsByPerson[s.debtor_name]) splitsByPerson[s.debtor_name] = [];
    splitsByPerson[s.debtor_name].push(s);
  });

  // Group debts by creditor (you owe them)
  const debtsByPerson: Record<string, typeof unpaidDebts> = {};
  unpaidDebts.forEach((d) => {
    if (!debtsByPerson[d.creditor_name]) debtsByPerson[d.creditor_name] = [];
    debtsByPerson[d.creditor_name].push(d);
  });

  // All unique person names
  const allPeople = [
    ...new Set([
      ...Object.keys(splitsByPerson),
      ...Object.keys(debtsByPerson),
    ]),
  ].sort();

  // Calculate net per person per currency
  // net = theyOweYou (splits) - youOweThem (debts)
  const personSummaries = allPeople.map((name) => {
    const personSplits = splitsByPerson[name] ?? [];
    const personDebts = debtsByPerson[name] ?? [];

    const theyOweYou: Record<string, number> = {};
    personSplits.forEach((s) => {
      const currency =
        (s.transactions as { currency: string } | null)?.currency ?? "CAD";
      theyOweYou[currency] = (theyOweYou[currency] ?? 0) + s.amount_owed;
    });

    const youOweThem: Record<string, number> = {};
    personDebts.forEach((d) => {
      youOweThem[d.currency] = (youOweThem[d.currency] ?? 0) + d.amount;
    });

    const allCurrencies = [
      ...new Set([...Object.keys(theyOweYou), ...Object.keys(youOweThem)]),
    ];

    const netByCurrency: Record<string, number> = {};
    allCurrencies.forEach((c) => {
      netByCurrency[c] = (theyOweYou[c] ?? 0) - (youOweThem[c] ?? 0);
    });

    return { name, netByCurrency };
  });

  // All known creditor names for the DebtForm
  const allCreditors = allPeople;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Balances</h1>
        <DebtForm creditors={allCreditors} />
      </div>

      {/* Summary cards per person */}
      {personSummaries.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {personSummaries.map(({ name, netByCurrency }) => {
            const totalNet = Object.values(netByCurrency).reduce((a, b) => a + b, 0);
            const isPositive = totalNet > 0;
            const isNegative = totalNet < 0;
            return (
            <div
              key={name}
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
                  {Object.entries(netByCurrency).map(([currency, net]) => (
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
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {totalNet !== 0 && (
                <div className="shrink-0">
                  <SettleDialog
                    personName={name}
                    netByCurrency={netByCurrency}
                    accounts={(accounts ?? []).map((a) => ({
                      id: a.id,
                      name: a.name,
                      currency: a.currency,
                      category: a.category,
                    }))}
                  />
                </div>
              )}
            </div>
            );
          })}
        </div>
      ) : (
        <p className="text-muted-foreground">No outstanding balances.</p>
      )}

      {/* Detail per person */}
      {personSummaries.length > 0 && (
        <Tabs defaultValue={personSummaries[0].name}>
          <TabsList variant="line" className="flex flex-wrap gap-2 h-auto p-0 bg-transparent">
            {personSummaries.map(({ name, netByCurrency }) => {
              const totalNet = Object.values(netByCurrency).reduce((a, b) => a + b, 0);
              const isPositive = totalNet > 0;
              const isNegative = totalNet < 0;
              return (
                <TabsTrigger
                  key={name}
                  value={name}
                  className="cursor-pointer !rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-all after:!hidden !h-auto inline-flex items-center gap-2 data-[state=active]:!bg-[var(--glass-bg-heavy)] data-[state=active]:!backdrop-blur-xl data-[state=active]:!border-[var(--glass-border)] data-[state=active]:!text-foreground data-[state=active]:!shadow-sm"
                >
                  <span
                    className={`inline-block size-2 rounded-full ${
                      isPositive
                        ? "bg-green-500"
                        : isNegative
                          ? "bg-orange-500"
                          : "bg-muted-foreground"
                    }`}
                  />
                  {name}
                </TabsTrigger>
              );
            })}
          </TabsList>
          {personSummaries.map(({ name }) => (
            <TabsContent key={name} value={name} className="space-y-6 mt-4">
              {(splitsByPerson[name] ?? []).length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                    They Owe You
                  </h3>
                  <SplitTable splits={splitsByPerson[name]} accounts={accounts ?? []} />
                </div>
              )}
              {(debtsByPerson[name] ?? []).length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                    You Owe Them
                  </h3>
                  <DebtTable debts={debtsByPerson[name]} accounts={accounts ?? []} />
                </div>
              )}
              <DebtForm
                creditors={allCreditors}
                defaultCreditor={name}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
