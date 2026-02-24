"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { recalculateBalance } from "@/lib/actions/accounts";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

export function RecalculateButton({ accountId }: { accountId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleRecalculate() {
    setLoading(true);
    try {
      await recalculateBalance(accountId);
      toast.success("Balance recalculated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to recalculate");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" disabled={loading} onClick={handleRecalculate}>
      <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      Recalculate Balance
    </Button>
  );
}
