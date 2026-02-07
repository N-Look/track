import { createClient } from "@/lib/supabase/server";
import { TransactionForm } from "@/components/transaction-form";
import { TransactionList } from "./transaction-list";

export default async function TransactionsPage() {
  const supabase = await createClient();

  const [{ data: accounts }, { data: transactions }] = await Promise.all([
    supabase.from("accounts").select("*").order("name"),
    supabase
      .from("transactions")
      .select("*, splits(id, debtor_name, amount_owed, is_paid), accounts(name)")
      .order("transaction_date", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Transactions</h1>
        <TransactionForm accounts={accounts ?? []} />
      </div>

      <TransactionList
        transactions={transactions ?? []}
        accounts={accounts ?? []}
      />
    </div>
  );
}
