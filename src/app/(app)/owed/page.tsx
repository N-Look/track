import { createClient } from "@/lib/supabase/server";
import { SplitTable } from "@/components/split-table";
import { OffsetForm } from "@/components/offset-form";
import { OffsetList } from "@/components/offset-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const currencySymbols: Record<string, string> = {
  CAD: "CA$",
  TTD: "TT$",
  USD: "US$",
};

export default async function OwedPage() {
  const supabase = await createClient();

  const [{ data: splits }, { data: offsets }] = await Promise.all([
    supabase
      .from("splits")
      .select("*, transactions(description, transaction_date, currency, account_id)")
      .eq("is_paid", false)
      .order("debtor_name"),
    supabase.from("offsets").select("*").order("created_at", { ascending: false }),
  ]);

  const unpaidSplits = splits ?? [];
  const allOffsets = offsets ?? [];

  // Group splits by debtor
  const splitsByDebtor = unpaidSplits.reduce(
    (acc, split) => {
      if (!acc[split.debtor_name]) acc[split.debtor_name] = [];
      acc[split.debtor_name].push(split);
      return acc;
    },
    {} as Record<string, typeof unpaidSplits>
  );

  // Group offsets by debtor
  const offsetsByDebtor = allOffsets.reduce(
    (acc, offset) => {
      if (!acc[offset.debtor_name]) acc[offset.debtor_name] = [];
      acc[offset.debtor_name].push(offset);
      return acc;
    },
    {} as Record<string, typeof allOffsets>
  );

  // All unique debtor names (from both splits and offsets)
  const allDebtors = [
    ...new Set([
      ...Object.keys(splitsByDebtor),
      ...Object.keys(offsetsByDebtor),
    ]),
  ].sort();

  // Calculate net amounts per debtor per currency
  const debtorSummaries = allDebtors.map((name) => {
    const debtorSplits = splitsByDebtor[name] ?? [];
    const debtorOffsets = offsetsByDebtor[name] ?? [];

    // Gross owed from splits
    const grossByCurrency: Record<string, number> = {};
    debtorSplits.forEach((s) => {
      const currency =
        (s.transactions as { currency: string } | null)?.currency ?? "CAD";
      grossByCurrency[currency] = (grossByCurrency[currency] ?? 0) + s.amount_owed;
    });

    // Total offsets
    const offsetByCurrency: Record<string, number> = {};
    debtorOffsets.forEach((o) => {
      offsetByCurrency[o.currency] =
        (offsetByCurrency[o.currency] ?? 0) + o.amount;
    });

    // Net = gross - offsets
    const allCurrencies = [
      ...new Set([
        ...Object.keys(grossByCurrency),
        ...Object.keys(offsetByCurrency),
      ]),
    ];

    const netByCurrency: Record<
      string,
      { gross: number; offset: number; net: number }
    > = {};
    allCurrencies.forEach((c) => {
      const gross = grossByCurrency[c] ?? 0;
      const offset = offsetByCurrency[c] ?? 0;
      netByCurrency[c] = { gross, offset, net: gross - offset };
    });

    return {
      name,
      netByCurrency,
      splitCount: debtorSplits.length,
      offsetCount: debtorOffsets.length,
    };
  });

  // Filter to only debtors with positive net in any currency
  const activeDebtors = debtorSummaries.filter((d) =>
    Object.values(d.netByCurrency).some((v) => v.gross > 0 || v.offset > 0)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Owed to Me</h1>
        <OffsetForm debtors={allDebtors} />
      </div>

      {/* Summary cards by debtor */}
      {activeDebtors.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeDebtors.map(({ name, netByCurrency }) => (
            <Card key={name}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {Object.entries(netByCurrency).map(
                  ([currency, { gross, offset, net }]) => (
                    <div key={currency}>
                      <div className="text-lg font-bold">
                        {currencySymbols[currency] ?? "$"}
                        {net.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                      {offset > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Gross: {currencySymbols[currency] ?? "$"}
                          {gross.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}{" "}
                          &minus; Offsets: {currencySymbols[currency] ?? "$"}
                          {offset.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                      )}
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">Nobody owes you anything right now.</p>
      )}

      {/* Split tables + offset lists by debtor */}
      {activeDebtors.length > 0 && (
        <Tabs defaultValue={activeDebtors[0].name}>
          <TabsList>
            {activeDebtors.map(({ name }) => (
              <TabsTrigger key={name} value={name}>
                {name}
              </TabsTrigger>
            ))}
          </TabsList>
          {activeDebtors.map(({ name }) => (
            <TabsContent key={name} value={name} className="space-y-4">
              {(splitsByDebtor[name] ?? []).length > 0 && (
                <SplitTable splits={splitsByDebtor[name]} />
              )}
              <OffsetList offsets={offsetsByDebtor[name] ?? []} />
              <OffsetForm debtors={allDebtors} defaultDebtor={name} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
