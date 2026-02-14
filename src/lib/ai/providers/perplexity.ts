import type { AIProvider, ExtractedTransaction, QuickAddResult } from "../types";

const VALID_CATEGORIES = [
  "food", "groceries", "transportation", "entertainment",
  "utilities", "shopping", "health", "education", "transfer", "other",
] as const;

function validateQuickAddResult(raw: Record<string, unknown>): QuickAddResult {
  const category = typeof raw.category === "string" && VALID_CATEGORIES.includes(raw.category as typeof VALID_CATEGORIES[number])
    ? raw.category as QuickAddResult["category"]
    : "other";

  return {
    description: typeof raw.description === "string" ? raw.description : "Unknown",
    amount: Math.abs(Number(raw.amount) || 0),
    date: typeof raw.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.date)
      ? raw.date
      : new Date().toISOString().split("T")[0],
    category,
    confidence: Math.min(100, Math.max(0, Number(raw.confidence) || 50)),
  };
}

export function createPerplexityProvider(apiKey: string): AIProvider {
  async function callPerplexity(messages: Array<{ role: string; content: unknown }>) {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages,
        temperature: 0.1,
        max_tokens: 16000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content ?? "";
    // Strip markdown code fences if present
    return raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
  }

  return {
    async extractTransactions(text: string, currency: string): Promise<ExtractedTransaction[]> {
      const prompt = `Extract all financial transactions from this bank statement text. For each transaction, provide:
- date (YYYY-MM-DD format)
- description (merchant/payee name, cleaned up)
- amount (positive for withdrawals/debits/spending, negative for deposits/credits/income)
- confidence (0-100, how confident you are this is correctly parsed)
- original_text (the raw line from the statement)

CRITICAL — Correctly classify each transaction as a withdrawal or deposit:
- Bank statements often have SEPARATE COLUMNS for "Withdrawals ($)" and "Deposits ($)". If a value appears in the Withdrawals column, the amount must be POSITIVE. If it appears in the Deposits column, the amount must be NEGATIVE.
- Other formats may use labels like "DR"/"CR", "debit"/"credit", or show +/- signs.
- Deposits (money IN: e-transfers received, payroll, refunds, credits) → NEGATIVE amount
- Withdrawals (money OUT: purchases, payments, fees, debits) → POSITIVE amount
- Look at the column headers and table structure to determine which column each amount belongs to. Do NOT treat all amounts as withdrawals.

Return ONLY a JSON array of objects with these exact fields. No markdown, no explanation, just the JSON array.

Currency: ${currency}

Bank statement text:
${text}`;

      const content = await callPerplexity([
        {
          role: "system",
          content: "You are a financial data extraction assistant. You extract transactions from bank statements and return structured JSON. Always return valid JSON arrays only.",
        },
        { role: "user", content: prompt },
      ]);

      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("AI did not return valid JSON. Response: " + content.slice(0, 200));
      }

      const parsed: ExtractedTransaction[] = JSON.parse(jsonMatch[0]);

      return parsed.map((t) => ({
        date: t.date || new Date().toISOString().split("T")[0],
        description: t.description || "Unknown",
        amount: Number(t.amount) || 0,
        confidence: Math.min(100, Math.max(0, Number(t.confidence) || 50)),
        original_text: t.original_text || "",
      }));
    },

    async parseReceiptImage(base64Image: string, mimeType: string, currency: string): Promise<QuickAddResult> {
      const content = await callPerplexity([
        {
          role: "system",
          content: "You are a receipt scanning assistant. Extract transaction details from receipt images and return structured JSON. Always return a single valid JSON object only.",
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64Image}` },
            },
            {
              type: "text",
              text: `Extract the transaction details from this receipt image. Return a single JSON object with these fields:
- description: merchant/store name and brief summary of purchase
- amount: total amount as a positive number (in ${currency})
- date: transaction date in YYYY-MM-DD format (use today ${new Date().toISOString().split("T")[0]} if not visible)
- category: one of "food", "groceries", "transportation", "entertainment", "utilities", "shopping", "health", "education", "transfer", "other"
- confidence: 0-100 how confident you are in the extraction

Return ONLY the JSON object. No markdown, no explanation.`,
            },
          ],
        },
      ]);

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("AI did not return valid JSON. Response: " + content.slice(0, 200));
      }

      return validateQuickAddResult(JSON.parse(jsonMatch[0]));
    },

    async parseNaturalLanguage(text: string, currency: string): Promise<QuickAddResult> {
      const today = new Date().toISOString().split("T")[0];

      const content = await callPerplexity([
        {
          role: "system",
          content: "You are a transaction parsing assistant. Parse natural language descriptions of spending into structured JSON. Always return a single valid JSON object only.",
        },
        {
          role: "user",
          content: `Parse this spending description into a transaction. Today's date is ${today}.

"${text}"

Return a single JSON object with these fields:
- description: cleaned up merchant/description name
- amount: the amount as a positive number (in ${currency})
- date: transaction date in YYYY-MM-DD format (resolve relative dates like "yesterday", "last Friday" relative to today ${today})
- category: one of "food", "groceries", "transportation", "entertainment", "utilities", "shopping", "health", "education", "transfer", "other"
- confidence: 0-100 how confident you are in the parsing

Return ONLY the JSON object. No markdown, no explanation.`,
        },
      ]);

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("AI did not return valid JSON. Response: " + content.slice(0, 200));
      }

      return validateQuickAddResult(JSON.parse(jsonMatch[0]));
    },
  };
}
