import { createClient } from "@/lib/supabase/server";
import { SplitTable } from "@/components/split-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const currencySymbols: Record<string, string> = {
  CAD: "CA$",
  TTD: "TT$",
  USD: "US$",
};

export default async function OwedPage() {
  const supabase = await createClient();

  const { data: splits } = await supabase
    .from("splits")
    .select("*, transactions(description, transaction_date, currency, account_id)")
    .eq("is_paid", false)
    .order("debtor_name");

  const unpaidSplits = splits ?? [];

  // Group by debtor
  const byDebtor = unpaidSplits.reduce(
    (acc, split) => {
      if (!acc[split.debtor_name]) acc[split.debtor_name] = [];
      acc[split.debtor_name].push(split);
      return acc;
    },
    {} as Record<string, typeof unpaidSplits>
  );

  // Total per debtor (with currency)
  const debtorTotals = Object.entries(byDebtor).map(([name, debtorSplits]) => {
    const totals: Record<string, number> = {};
    debtorSplits.forEach((s) => {
      const currency =
        (s.transactions as { currency: string } | null)?.currency ?? "CAD";
      totals[currency] = (totals[currency] ?? 0) + s.amount_owed;
    });
    return { name, totals, count: debtorSplits.length };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Owed to Me</h1>

      {/* Summary cards by debtor */}
      {debtorTotals.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {debtorTotals.map(({ name, totals, count }) => (
            <Card key={name}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{name}</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.entries(totals).map(([currency, total]) => (
                  <div key={currency} className="text-lg font-bold">
                    {currencySymbols[currency] ?? "$"}
                    {total.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  {count} unpaid split{count > 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">Nobody owes you anything right now.</p>
      )}

      {/* Split tables by debtor */}
      {Object.keys(byDebtor).length > 0 && (
        <Tabs defaultValue={Object.keys(byDebtor)[0]}>
          <TabsList>
            {Object.keys(byDebtor).map((name) => (
              <TabsTrigger key={name} value={name}>
                {name}
              </TabsTrigger>
            ))}
          </TabsList>
          {Object.entries(byDebtor).map(([name, debtorSplits]) => (
            <TabsContent key={name} value={name}>
              <SplitTable splits={debtorSplits} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
