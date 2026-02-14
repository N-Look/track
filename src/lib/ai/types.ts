export interface ExtractedTransaction {
  date: string;
  description: string;
  amount: number;
  confidence: number;
  original_text: string;
}

export interface QuickAddResult {
  description: string;
  amount: number;
  date: string;
  category:
    | "food"
    | "groceries"
    | "transportation"
    | "entertainment"
    | "utilities"
    | "shopping"
    | "health"
    | "education"
    | "transfer"
    | "other";
  confidence: number;
}

export interface AIProvider {
  extractTransactions(text: string, currency: string): Promise<ExtractedTransaction[]>;
  parseReceiptImage(base64Image: string, mimeType: string, currency: string): Promise<QuickAddResult>;
  parseNaturalLanguage(text: string, currency: string): Promise<QuickAddResult>;
}
