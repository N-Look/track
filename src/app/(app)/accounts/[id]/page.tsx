import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { currencySymbols, formatAmount } from "@/lib/currency";
import { RecalculateButton } from "./recalculate-button";
import { AddTransactionDialog } from "@/components/add-transaction-dialog";
import { PayCreditCardDialog } from "@/components/pay-credit-card-dialog";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const categoryLabels: Record<string, string> = {
  bank: "Bank",
  credit_card: "Credit Card",
  third_party: "Third Party",
};

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: account }, { data: allAccounts }] = await Promise.all([
    supabase.from("accounts").select("*").eq("id", id).single(),
    supabase.from("accounts").select("*").order("name"),
  ]);

  if (!account) notFound();

  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .eq("account_id", id)
    .order("transaction_date", { ascending: false });

  const txList = transactions ?? [];
  const symbol = currencySymbols[account.currency] ?? "$";

  // Compute summary
  let totalCredits = 0;
  let totalDebits = 0;
  for (const tx of txList) {
    if (tx.balance_direction === "credit") {
      totalCredits += tx.amount;
    } else {
      totalDebits += tx.amount;
    }
  }

  // Compute running balance (from oldest to newest, then reverse for display)
  const sortedAsc = [...txList].reverse();
  const runningBalances: number[] = [];
  let running = 0;
  for (const tx of sortedAsc) {
    if (tx.balance_direction === "debit") {
      running += account.category === "credit_card" ? tx.amount : -tx.amount;
    } else {
      running += account.category === "credit_card" ? -tx.amount : tx.amount;
    }
    runningBalances.push(running);
  }
  // Reverse to match display order (newest first)
  runningBalances.reverse();

  return (
    <div className="space-y-6">
      <Link
        href="/accounts"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Accounts
      </Link>

      {/* Account header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{account.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary">{categoryLabels[account.category]}</Badge>
            <span className="text-muted-foreground">{account.currency}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              {account.category === "credit_card" ? "Total Spent" : "Balance"}
            </p>
            <p className="text-2xl font-bold">
              {symbol}
              {(account.current_balance ?? 0).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          {account.category === "credit_card" && (
            <PayCreditCardDialog
              creditCardAccount={account}
              bankAccounts={(allAccounts ?? []).filter((a) => a.category !== "credit_card")}
            />
          )}
          <AddTransactionDialog
            accounts={allAccounts ?? []}
            defaultAccountId={account.id}
          />
          <RecalculateButton accountId={account.id} />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Credits (Money In)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-emerald-500">
              +{symbol}
              {totalCredits.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Debits (Money Out)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-red-500">
              -{symbol}
              {totalDebits.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction history */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          Transaction History ({txList.length})
        </h2>

        {txList.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">
            No transactions for this account.
          </p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block glass rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Running Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txList.map((tx, i) => (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap">
                        {tx.transaction_date ?? "—"}
                      </TableCell>
                      <TableCell>{tx.description}</TableCell>
                      <TableCell
                        className={`text-right whitespace-nowrap font-medium ${
                          tx.balance_direction === "credit"
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {tx.balance_direction === "credit" ? "+" : "-"}
                        {formatAmount(tx.amount, symbol)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap font-mono text-sm">
                        {symbol}
                        {runningBalances[i].toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-2 md:hidden">
              {txList.map((tx, i) => (
                <div key={tx.id} className="glass-card rounded-xl p-3 space-y-1">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {tx.transaction_date ?? "—"}
                      </p>
                    </div>
                    <p
                      className={`font-bold shrink-0 ${
                        tx.balance_direction === "credit"
                          ? "text-emerald-500"
                          : "text-rose-500"
                      }`}
                    >
                      {tx.balance_direction === "credit" ? "+" : "-"}
                      {formatAmount(tx.amount, symbol)}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground text-right font-mono">
                    Balance: {symbol}
                    {runningBalances[i].toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
