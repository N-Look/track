import type { AIProvider, ExtractedTransaction } from "../types";

export function createPerplexityProvider(apiKey: string): AIProvider {
  return {
    async extractTransactions(text: string, currency: string): Promise<ExtractedTransaction[]> {
      const prompt = `Extract all financial transactions from this bank statement text. For each transaction, provide:
- date (YYYY-MM-DD format)
- description (merchant/payee name, cleaned up)
- amount (positive number — treat debits/withdrawals as positive spending amounts)
- confidence (0-100, how confident you are this is correctly parsed)
- original_text (the raw line from the statement)

Return ONLY a JSON array of objects with these exact fields. No markdown, no explanation, just the JSON array.

Currency: ${currency}

Bank statement text:
${text}`;

      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar",
          messages: [
            {
              role: "system",
              content: "You are a financial data extraction assistant. You extract transactions from bank statements and return structured JSON. Always return valid JSON arrays only.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Perplexity API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content ?? "";

      // Extract JSON from the response (handle possible markdown wrapping)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("AI did not return valid JSON. Response: " + content.slice(0, 200));
      }

      const parsed: ExtractedTransaction[] = JSON.parse(jsonMatch[0]);

      // Validate and normalize
      return parsed.map((t) => ({
        date: t.date || new Date().toISOString().split("T")[0],
        description: t.description || "Unknown",
        amount: Math.abs(Number(t.amount) || 0),
        confidence: Math.min(100, Math.max(0, Number(t.confidence) || 50)),
        original_text: t.original_text || "",
      }));
    },
  };
}
