"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createTransaction } from "@/lib/actions/transactions";
import { parseReceipt, parseText } from "@/lib/actions/quick-add";
import type { QuickAddResult } from "@/lib/ai/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Zap, Camera, Type, ArrowLeft, Loader2 } from "lucide-react";
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

type Step = "input" | "review";

export function QuickAdd({ accounts }: { accounts: Tables<"accounts">[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("input");
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Input state
  const [textInput, setTextInput] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const selectedFileRef = useRef<File | null>(null);

  // Review state
  const [result, setResult] = useState<QuickAddResult | null>(null);
  const [accountId, setAccountId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("other");

  function reset() {
    setStep("input");
    setTextInput("");
    setImagePreview(null);
    selectedFileRef.current = null;
    setResult(null);
    setAccountId("");
    setDescription("");
    setAmount("");
    setDate("");
    setCategory("other");
    if (fileRef.current) fileRef.current.value = "";
  }

  function populateReview(r: QuickAddResult) {
    setResult(r);
    setDescription(r.description);
    setAmount(r.amount.toString());
    setDate(r.date);
    setCategory(r.category);
    setStep("review");
  }

  async function handleParseText() {
    if (!textInput.trim()) return;
    setParsing(true);
    try {
      const formData = new FormData();
      formData.set("text", textInput);
      formData.set("currency", "CAD");
      const r = await parseText(formData);
      populateReview(r);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to parse text");
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

  async function handleScanReceipt() {
    const file = selectedFileRef.current;
    if (!file) return;
    setParsing(true);
    try {
      const formData = new FormData();
      formData.set("receipt", file);
      formData.set("currency", "CAD");
      const r = await parseReceipt(formData);
      populateReview(r);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to scan receipt");
    } finally {
      setParsing(false);
    }
  }

  async function handleConfirm() {
    if (!accountId) {
      toast.error("Please select an account");
      return;
    }
    setSubmitting(true);
    try {
      const selectedAccount = accounts.find((a) => a.id === accountId);
      const formData = new FormData();
      formData.set("account_id", accountId);
      formData.set("description", description);
      formData.set("amount", amount);
      formData.set("transaction_date", date);
      formData.set("category", category);
      formData.set("currency", selectedAccount?.currency ?? "CAD");
      formData.set("is_repayment", "false");
      formData.set("is_transfer_to_third_party", "false");

      await createTransaction(formData);
      toast.success("Transaction created");
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create transaction");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Zap className="mr-2 h-4 w-4" />
          Quick Add
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Quick Add Transaction</DialogTitle>
        </DialogHeader>

        {step === "input" && (
          <Tabs defaultValue="text" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="text" className="flex-1">
                <Type className="mr-1.5 h-4 w-4" />
                Text
              </TabsTrigger>
              <TabsTrigger value="receipt" className="flex-1">
                <Camera className="mr-1.5 h-4 w-4" />
                Receipt
              </TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="quick-text">Describe your transaction</Label>
                <textarea
                  id="quick-text"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder='e.g. "lunch at subway $12.50 yesterday"'
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleParseText();
                    }
                  }}
                />
              </div>
              <Button
                onClick={handleParseText}
                disabled={parsing || !textInput.trim()}
                className="w-full"
              >
                {parsing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  "Parse"
                )}
              </Button>
            </TabsContent>

            <TabsContent value="receipt" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="receipt-file">Upload or snap a receipt</Label>
                <Input
                  ref={fileRef}
                  id="receipt-file"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                />
              </div>
              {imagePreview && (
                <div className="rounded-lg border overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Receipt preview"
                    className="max-h-48 w-full object-contain"
                  />
                </div>
              )}
              <Button
                onClick={handleScanReceipt}
                disabled={parsing || !imagePreview}
                className="w-full"
              >
                {parsing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  "Scan Receipt"
                )}
              </Button>
            </TabsContent>
          </Tabs>
        )}

        {step === "review" && result && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep("input")}
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
              <Badge
                variant={result.confidence >= 80 ? "default" : "secondary"}
              >
                {result.confidence}% confidence
              </Badge>
            </div>

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

            <div className="space-y-2">
              <Label htmlFor="review-description">Description</Label>
              <Input
                id="review-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="review-amount">Amount</Label>
              <Input
                id="review-amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="review-date">Date</Label>
              <Input
                id="review-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
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

            <Button
              onClick={handleConfirm}
              disabled={submitting || !accountId}
              className="w-full"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
