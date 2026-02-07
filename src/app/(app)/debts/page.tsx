import { createClient } from "@/lib/supabase/server";
import { DebtForm } from "@/components/debt-form";
import { DebtTable } from "@/components/debt-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const currencySymbols: Record<string, string> = {
  CAD: "CA$",
  TTD: "TT$",
  USD: "US$",
};

export default async function DebtsPage() {
  const supabase = await createClient();

  const { data: debts } = await supabase
    .from("debts")
    .select("*")
    .eq("is_paid", false)
    .order("created_at", { ascending: false });

  const unpaidDebts = debts ?? [];

  // Group by creditor
  const debtsByCreditor = unpaidDebts.reduce(
    (acc, debt) => {
      if (!acc[debt.creditor_name]) acc[debt.creditor_name] = [];
      acc[debt.creditor_name].push(debt);
      return acc;
    },
    {} as Record<string, typeof unpaidDebts>
  );

  const creditors = Object.keys(debtsByCreditor).sort();

  // Summary per creditor per currency
  const creditorSummaries = creditors.map((name) => {
    const creditorDebts = debtsByCreditor[name];
    const totalByCurrency: Record<string, number> = {};
    creditorDebts.forEach((d) => {
      totalByCurrency[d.currency] =
        (totalByCurrency[d.currency] ?? 0) + d.amount;
    });
    return { name, totalByCurrency, count: creditorDebts.length };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">I Owe</h1>
        <DebtForm creditors={creditors} />
      </div>

      {/* Summary cards by creditor */}
      {creditorSummaries.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {creditorSummaries.map(({ name, totalByCurrency }) => (
            <Card key={name}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {Object.entries(totalByCurrency).map(([currency, total]) => (
                  <div key={currency} className="text-lg font-bold text-orange-600 dark:text-orange-400">
                    {currencySymbols[currency] ?? "$"}
                    {total.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">You don&apos;t owe anyone right now.</p>
      )}

      {/* Tabs per creditor with debt tables */}
      {creditorSummaries.length > 0 && (
        <Tabs defaultValue={creditorSummaries[0].name}>
          <TabsList>
            {creditorSummaries.map(({ name }) => (
              <TabsTrigger key={name} value={name}>
                {name}
              </TabsTrigger>
            ))}
          </TabsList>
          {creditorSummaries.map(({ name }) => (
            <TabsContent key={name} value={name} className="space-y-4">
              <DebtTable debts={debtsByCreditor[name]} />
              <DebtForm creditors={creditors} defaultCreditor={name} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
