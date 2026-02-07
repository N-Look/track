import { createClient } from "@/lib/supabase/server";
import { SplitTable } from "@/components/split-table";
import { DebtForm } from "@/components/debt-form";
import { DebtTable } from "@/components/debt-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {personSummaries.map(({ name, netByCurrency }) => (
            <Card key={name}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {Object.entries(netByCurrency).map(([currency, net]) => (
                  <div key={currency}>
                    <div
                      className={`text-lg font-bold ${
                        net > 0
                          ? "text-green-600 dark:text-green-400"
                          : net < 0
                            ? "text-orange-600 dark:text-orange-400"
                            : ""
                      }`}
                    >
                      {net > 0 ? "+" : ""}
                      {currencySymbols[currency] ?? "$"}
                      {Math.abs(net).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {net > 0
                        ? "They owe you"
                        : net < 0
                          ? "You owe them"
                          : "Settled"}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No outstanding balances.</p>
      )}

      {/* Tabs per person with splits + debts detail */}
      {personSummaries.length > 0 && (
        <Tabs defaultValue={personSummaries[0].name}>
          <TabsList className="w-full max-w-full overflow-x-auto justify-start">
            {personSummaries.map(({ name }) => (
              <TabsTrigger key={name} value={name}>
                {name}
              </TabsTrigger>
            ))}
          </TabsList>
          {personSummaries.map(({ name }) => (
            <TabsContent key={name} value={name} className="space-y-6">
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
                  <DebtTable debts={debtsByPerson[name]} />
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
