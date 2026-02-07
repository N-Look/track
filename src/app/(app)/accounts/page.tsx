import { createClient } from "@/lib/supabase/server";
import { AccountCard } from "@/components/account-card";
import { AccountActions } from "./account-actions";

export default async function AccountsPage() {
  const supabase = await createClient();
  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .order("currency")
    .order("name");

  const grouped = (accounts ?? []).reduce(
    (acc, account) => {
      const curr = account.currency;
      if (!acc[curr]) acc[curr] = [];
      acc[curr].push(account);
      return acc;
    },
    {} as Record<string, typeof accounts>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Accounts</h1>
        <AccountActions />
      </div>

      {Object.entries(grouped).map(([currency, accts]) => (
        <div key={currency}>
          <h2 className="mb-4 text-xl font-semibold">{currency}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accts!.map((account) => (
              <div key={account.id} className="group relative">
                <AccountCard account={account} />
                <AccountActions account={account} />
              </div>
            ))}
          </div>
        </div>
      ))}

      {(accounts ?? []).length === 0 && (
        <p className="text-muted-foreground">
          No accounts yet. Click &quot;Add Account&quot; to create one.
        </p>
      )}
    </div>
  );
}
