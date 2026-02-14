"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ListFilter, X } from "lucide-react";
import { useState } from "react";
import type { Tables } from "@/lib/supabase/types";

const CATEGORIES = [
    "food", "groceries", "transportation", "entertainment", "utilities",
    "shopping", "health", "education", "transfer", "other",
] as const;

export interface FilterState {
    account: string;
    currency: string;
    category: string;
    month: string;
}

interface FilterDialogProps {
    accounts: Tables<"accounts">[];
    months: string[];
    filters: FilterState;
    onFilterChange: (filters: FilterState) => void;
    categoryLabels: Record<string, string>;
}

export function FilterDialog({
    accounts,
    months,
    filters,
    onFilterChange,
    categoryLabels,
}: FilterDialogProps) {
    const [open, setOpen] = useState(false);

    // Local state for the form inside dialog
    const [localFilters, setLocalFilters] = useState<FilterState>(filters);

    const activeCount = Object.values(filters).filter((v) => v !== "all").length;

    function handleApply() {
        onFilterChange(localFilters);
        setOpen(false);
    }

    function handleReset() {
        const reset = {
            account: "all",
            currency: "all",
            category: "all",
            month: "all",
        };
        setLocalFilters(reset);
        onFilterChange(reset);
        setOpen(false);
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                setOpen(v);
                if (v) setLocalFilters(filters);
            }}
        >
            <DialogTrigger asChild>
                <Button variant="outline" className="h-10 gap-2 rounded-full border-dashed">
                    <ListFilter className="h-4 w-4" />
                    Filter
                    {activeCount > 0 && (
                        <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs font-normal">
                            {activeCount}
                        </Badge>
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xs sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Filter Transactions</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Account</Label>
                        <Select
                            value={localFilters.account}
                            onValueChange={(v) => setLocalFilters({ ...localFilters, account: v })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="All Accounts" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Accounts</SelectItem>
                                {accounts.map((a) => (
                                    <SelectItem key={a.id} value={a.id}>
                                        {a.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Currency</Label>
                        <Select
                            value={localFilters.currency}
                            onValueChange={(v) => setLocalFilters({ ...localFilters, currency: v })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="All Currencies" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Currencies</SelectItem>
                                <SelectItem value="CAD">CAD</SelectItem>
                                <SelectItem value="TTD">TTD</SelectItem>
                                <SelectItem value="USD">USD</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Category</Label>
                        <Select
                            value={localFilters.category}
                            onValueChange={(v) => setLocalFilters({ ...localFilters, category: v })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {CATEGORIES.map((c) => (
                                    <SelectItem key={c} value={c}>
                                        {categoryLabels[c]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Month</Label>
                        <Select
                            value={localFilters.month}
                            onValueChange={(v) => setLocalFilters({ ...localFilters, month: v })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="All Months" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Months</SelectItem>
                                {months.map((m) => {
                                    const [y, mo] = m.split("-");
                                    const label = new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString("en-US", {
                                        year: "numeric",
                                        month: "long",
                                    });
                                    return (
                                        <SelectItem key={m} value={m}>
                                            {label}
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                    <Button variant="ghost" onClick={handleReset}>Clear All</Button>
                    <Button onClick={handleApply}>Apply Filters</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
