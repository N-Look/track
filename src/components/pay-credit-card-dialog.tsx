"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAccountTransfer } from "@/lib/actions/transactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/lib/supabase/types";

export function PayCreditCardDialog({
    creditCardAccount,
    bankAccounts,
}: {
    creditCardAccount: Tables<"accounts">;
    bankAccounts: Tables<"accounts">[];
}) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fromAccountId, setFromAccountId] = useState(bankAccounts[0]?.id ?? "");
    const [amount, setAmount] = useState(
        (creditCardAccount.current_balance ?? 0).toFixed(2)
    );
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [note, setNote] = useState("");

    const balance = creditCardAccount.current_balance ?? 0;

    async function handleSubmit() {
        if (!fromAccountId) {
            toast.error("Please select a bank account");
            return;
        }
        const parsedAmount = parseFloat(amount);
        if (!parsedAmount || parsedAmount <= 0) {
            toast.error("Enter a valid amount");
            return;
        }
        setLoading(true);
        try {
            const formData = new FormData();
            formData.set("from_account_id", fromAccountId);
            formData.set("to_account_id", creditCardAccount.id);
            formData.set("amount", amount);
            formData.set("transaction_date", date);
            formData.set("note", note || "Credit card payment");
            await createAccountTransfer(formData);
            toast.success("Payment recorded");
            setOpen(false);
            router.refresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to record payment");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pay Off Card
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Pay Credit Card</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                    <div className="glass-light rounded-lg p-3 text-sm border border-border/50 space-y-1">
                        <p className="text-muted-foreground">Current balance on <strong className="text-foreground">{creditCardAccount.name}</strong></p>
                        <p className="text-xl font-bold">
                            ${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {creditCardAccount.currency}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>Pay from</Label>
                        <Select value={fromAccountId} onValueChange={setFromAccountId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select bank account" />
                            </SelectTrigger>
                            <SelectContent>
                                {bankAccounts.map((a) => (
                                    <SelectItem key={a.id} value={a.id}>
                                        {a.name} ({a.currency})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label htmlFor="pay-amount">Amount</Label>
                            <Input
                                id="pay-amount"
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pay-date">Date</Label>
                            <Input
                                id="pay-date"
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="pay-note">Note (optional)</Label>
                        <Input
                            id="pay-note"
                            placeholder="e.g. February payment"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                    </div>

                    <Button
                        onClick={handleSubmit}
                        disabled={loading || !fromAccountId || bankAccounts.length === 0}
                        className="w-full"
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Record Payment
                    </Button>

                    {bankAccounts.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center">
                            No bank accounts found to pay from.
                        </p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
