"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createTransaction } from "@/lib/actions/transactions";
import { parseReceipt, parseText } from "@/lib/actions/quick-add";
import type { QuickAddResult } from "@/lib/ai/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Zap, Type, Camera, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/lib/supabase/types";

const CATEGORIES = [
    { value: "food", label: "Food" },
    { value: "groceries", label: "Groceries" },
    { value: "transportation", label: "Transportation" },
    { value: "entertainment", label: "Entertainment" },
    { value: "utilities", label: "Utilities" },
    { value: "shopping", label: "Shopping" },
    { value: "health", label: "Health" },
    { value: "education", label: "Education" },
    { value: "transfer", label: "Transfer" },
    { value: "other", label: "Other" },
] as const;

interface SplitRow {
    debtor_name: string;
    amount_owed: string;
}

export function AddTransactionDialog({
    accounts,
}: {
    accounts: Tables<"accounts">[];
}) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("manual");

    // Manual Form State
    const [accountId, setAccountId] = useState("");
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [category, setCategory] = useState("other");
    const [isRepayment, setIsRepayment] = useState(false);
    const [isTransfer, setIsTransfer] = useState(false);
    const [hasSplits, setHasSplits] = useState(false);
    const [splitMode, setSplitMode] = useState<"manual" | "equal">("manual");
    const [includeSelf, setIncludeSelf] = useState(true);
    const [splitNames, setSplitNames] = useState<string[]>([""]);
    const [splits, setSplits] = useState<SplitRow[]>([]);
    const [amountSent, setAmountSent] = useState("");
    const [netReceived, setNetReceived] = useState("");

    // AI State
    const [parsing, setParsing] = useState(false);
    const [aiText, setAiText] = useState("");
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const selectedFileRef = useRef<File | null>(null);

    const selectedAccount = accounts.find((a) => a.id === accountId);
    const feeLost =
        isTransfer && amountSent && netReceived
            ? (parseFloat(amountSent) - parseFloat(netReceived)).toFixed(2)
            : "0.00";

    function resetForm() {
        setAccountId("");
        setDescription("");
        setAmount("");
        setDate(new Date().toISOString().split("T")[0]);
        setCategory("other");
        setIsRepayment(false);
        setIsTransfer(false);
        setHasSplits(false);
        setSplitMode("manual");
        setIncludeSelf(true);
        setSplitNames([""]);
        setSplits([]);
        setAmountSent("");
        setNetReceived("");
        setAiText("");
        setImagePreview(null);
        selectedFileRef.current = null;
        if (fileRef.current) fileRef.current.value = "";
        setActiveTab("manual");
    }

    // AI Logic
    async function handleParseText() {
        if (!aiText.trim()) return;
        setParsing(true);
        try {
            const formData = new FormData();
            formData.set("text", aiText);
            formData.set("currency", "CAD"); // Default or infer?
            const r = await parseText(formData);
            populateFromAI(r);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to parse text");
        } finally {
            setParsing(false);
        }
    }

    async function handleScanReceipt() {
        const file = selectedFileRef.current;
        if (!file) return;
        setParsing(true);
        try {
            const formData = new FormData();
            formData.set("receipt", file);
            formData.set("currency", "CAD");
            const r = await parseReceipt(formData);
            populateFromAI(r);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to scan receipt");
        } finally {
            setParsing(false);
        }
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        selectedFileRef.current = file;
        const url = URL.createObjectURL(file);
        setImagePreview(url);
    }

    function populateFromAI(r: QuickAddResult) {
        setDescription(r.description);
        setAmount(r.amount.toString());
        setDate(r.date);
        setCategory(r.category);
        setActiveTab("manual");
        toast.success(`Parsed: ${r.description} - $${r.amount}`);
    }

    // Form Logic
    function addSplit() {
        setSplits([...splits, { debtor_name: "", amount_owed: "" }]);
    }

    function removeSplit(index: number) {
        setSplits(splits.filter((_, i) => i !== index));
    }

    function updateSplit(index: number, field: keyof SplitRow, value: string) {
        const updated = [...splits];
        updated[index] = { ...updated[index], [field]: value };
        setSplits(updated);
    }

    async function handleSubmit() {
        if (!accountId) {
            toast.error("Please select an account");
            return;
        }
        setLoading(true);

        try {
            const formData = new FormData();
            formData.set("account_id", accountId);
            formData.set("description", description);
            formData.set("transaction_date", date);
            formData.set("category", category);
            formData.set("is_repayment", isRepayment.toString());
            formData.set("is_transfer_to_third_party", isTransfer.toString());
            formData.set("currency", selectedAccount?.currency ?? "CAD");

            if (isTransfer) {
                formData.set("amount", amountSent);
                formData.set("fee_lost", feeLost);
            } else {
                formData.set("amount", amount);
            }

            if (hasSplits) {
                if (splitMode === "equal") {
                    const totalAmount = parseFloat(isTransfer ? amountSent : amount) || 0;
                    const validNames = splitNames.filter((n) => n.trim());
                    const splitCount = validNames.length + (includeSelf ? 1 : 0);
                    if (validNames.length > 0 && splitCount > 0 && totalAmount > 0) {
                        const perPerson = Math.floor((totalAmount / splitCount) * 100) / 100;
                        const remainder = Math.round((totalAmount - perPerson * splitCount) * 100) / 100;
                        const equalSplits = validNames.map((name, i) => ({
                            debtor_name: name.trim(),
                            amount_owed: i === 0 ? perPerson + remainder : perPerson,
                        }));
                        formData.set("splits", JSON.stringify(equalSplits));
                    }
                } else if (splits.length > 0) {
                    const validSplits = splits
                        .filter((s) => s.debtor_name && s.amount_owed)
                        .map((s) => ({
                            debtor_name: s.debtor_name,
                            amount_owed: parseFloat(s.amount_owed),
                        }));
                    formData.set("splits", JSON.stringify(validSplits));
                }
            }

            await createTransaction(formData);
            toast.success("Transaction created");
            setOpen(false);
            resetForm();
            router.refresh();
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "Failed to create transaction"
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                setOpen(v);
                if (!v) resetForm();
            }}
        >
            <DialogTrigger asChild>
                <Button className="h-10 px-4 shadow-md bg-primary hover:bg-primary/90 transition-all hover:scale-105">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Transaction
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg p-0 gap-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle>Add Transaction</DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="px-6">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                            <TabsTrigger value="quick-add" className="gap-2">
                                <Sparkles className="h-3 w-3 text-amber-500" />
                                Quick Add
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="p-6 pt-4">
                        <TabsContent value="manual" className="space-y-4 data-[state=inactive]:hidden mt-0">
                            {/* Account Selection */}
                            <div className="space-y-2">
                                <Label>Account</Label>
                                <Select value={accountId} onValueChange={setAccountId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select account" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {accounts.map((a) => (
                                            <SelectItem key={a.id} value={a.id}>
                                                {a.name} ({a.currency})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Basic Fields */}
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Input
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="What was this for?"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="amount">Amount</Label>
                                    <Input
                                        id="amount"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        disabled={isTransfer} // Handled separately in transfer mode
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="date">Date</Label>
                                    <Input
                                        id="date"
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map((c) => (
                                            <SelectItem key={c.value} value={c.value}>
                                                {c.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Toggles */}
                            <div className="space-y-3 glass-input rounded-xl p-3 border border-border/50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label htmlFor="repayment" className="cursor-pointer">Money In (Credit)</Label>
                                        <p className="text-xs text-muted-foreground">Refund, repayment, or deposit that increases your balance</p>
                                    </div>
                                    <Switch
                                        id="repayment"
                                        checked={isRepayment}
                                        onCheckedChange={(v) => {
                                            setIsRepayment(v);
                                            if (v) setIsTransfer(false);
                                        }}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="transfer" className="cursor-pointer">Third-Party Transfer</Label>
                                    <Switch
                                        id="transfer"
                                        checked={isTransfer}
                                        onCheckedChange={(v) => {
                                            setIsTransfer(v);
                                            if (v) setIsRepayment(false);
                                        }}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="split" className="cursor-pointer">Split with others</Label>
                                    <Switch
                                        id="split"
                                        checked={hasSplits}
                                        onCheckedChange={setHasSplits}
                                    />
                                </div>
                            </div>

                            {/* Transfer Logic */}
                            {isTransfer && (
                                <div className="space-y-3 animate-in slide-in-from-top-2 fade-in duration-200">
                                    <div className="space-y-2">
                                        <Label htmlFor="amount_sent">Amount Sent (CAD)</Label>
                                        <Input
                                            id="amount_sent"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={amountSent}
                                            onChange={(e) => setAmountSent(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="net_received">Net Received (USD)</Label>
                                        <Input
                                            id="net_received"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={netReceived}
                                            onChange={(e) => setNetReceived(e.target.value)}
                                        />
                                    </div>
                                    <div className="glass-light rounded-lg p-2 text-sm text-muted-foreground border border-border/50">
                                        Calculated Fee Lost: <strong className="text-foreground">${feeLost}</strong>
                                    </div>
                                </div>
                            )}

                            {/* Split Logic (Detailed Implementation Omitted for Brevity - using simplified logic or just manual) */}
                            {hasSplits && (
                                <div className="space-y-4 border-t pt-4">
                                    <div className="flex items-center justify-between">
                                        <Label>Splits</Label>
                                        <div className="flex gap-1">
                                            <Button
                                                type="button"
                                                variant={splitMode === "equal" ? "default" : "outline"}
                                                size="xs"
                                                onClick={() => setSplitMode("equal")}
                                            >
                                                Equal
                                            </Button>
                                            <Button
                                                type="button"
                                                variant={splitMode === "manual" ? "default" : "outline"}
                                                size="xs"
                                                onClick={() => setSplitMode("manual")}
                                            >
                                                Manual
                                            </Button>
                                        </div>
                                    </div>

                                    {splitMode === "equal" ? (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="include-self" className="text-xs">Include myself</Label>
                                                <Switch
                                                    id="include-self"
                                                    checked={includeSelf}
                                                    onCheckedChange={setIncludeSelf}
                                                />
                                            </div>
                                            {splitNames.map((name, i) => (
                                                <div key={i} className="flex gap-2">
                                                    <Input
                                                        placeholder={`Person ${i + 1}`}
                                                        value={name}
                                                        className="h-9"
                                                        onChange={(e) => {
                                                            const updated = [...splitNames];
                                                            updated[i] = e.target.value;
                                                            setSplitNames(updated);
                                                        }}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9"
                                                        onClick={() => setSplitNames(splitNames.filter((_, j) => j !== i))}
                                                        disabled={splitNames.length <= 1}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="w-full text-xs"
                                                onClick={() => setSplitNames([...splitNames, ""])}
                                            >
                                                <Plus className="mr-1 h-3 w-3" />
                                                Add Person
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {splits.map((split, i) => (
                                                <div key={i} className="flex gap-2">
                                                    <Input
                                                        placeholder="Name"
                                                        value={split.debtor_name}
                                                        className="h-9"
                                                        onChange={(e) => updateSplit(i, "debtor_name", e.target.value)}
                                                    />
                                                    <Input
                                                        placeholder="Amount"
                                                        type="number"
                                                        className="h-9"
                                                        value={split.amount_owed}
                                                        onChange={(e) => updateSplit(i, "amount_owed", e.target.value)}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9"
                                                        onClick={() => removeSplit(i)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="w-full text-xs"
                                                onClick={addSplit}
                                            >
                                                <Plus className="mr-1 h-3 w-3" />
                                                Add Split
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            <Button
                                onClick={handleSubmit}
                                disabled={loading || !accountId}
                                className="w-full mt-6"
                            >
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Create Transaction
                            </Button>
                        </TabsContent>

                        <TabsContent value="quick-add" className="space-y-6 data-[state=inactive]:hidden mt-0">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Using Text</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={aiText}
                                            onChange={(e) => setAiText(e.target.value)}
                                            placeholder='e.g. "Lunch at subway $15.50"'
                                            className="flex-1"
                                            onKeyDown={(e) => e.key === "Enter" && handleParseText()}
                                        />
                                        <Button onClick={handleParseText} disabled={parsing || !aiText}>
                                            {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-background px-2 text-muted-foreground">Or</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Scan Receipt</Label>
                                    <div className="flex flex-col gap-3">
                                        <Input
                                            ref={fileRef}
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            onChange={handleFileChange}
                                            className="file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                        />
                                        {imagePreview && (
                                            <div className="rounded-lg border overflow-hidden bg-muted/50 p-2 flex justify-center">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={imagePreview}
                                                    alt="To scan"
                                                    className="max-h-40 object-contain rounded-md"
                                                />
                                            </div>
                                        )}
                                        <Button
                                            onClick={handleScanReceipt}
                                            disabled={parsing || !imagePreview}
                                            variant="secondary"
                                            className="w-full"
                                        >
                                            {parsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                                            Scan Receipt
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl text-sm text-muted-foreground border border-blue-100 dark:border-blue-900/20">
                                <p className="flex items-center gap-2 mb-1 text-foreground font-medium">
                                    <Sparkles className="h-3 w-3 text-blue-500" />
                                    How it works
                                </p>
                                <p>
                                    Enter text or upload a receipt. The AI will extract the date, amount, description, and category. The form will be populated for your review.
                                </p>
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
