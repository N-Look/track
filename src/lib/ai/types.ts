export interface ExtractedTransaction {
  date: string;
  description: string;
  amount: number;
  confidence: number;
  original_text: string;
}

export interface AIProvider {
  extractTransactions(text: string, currency: string): Promise<ExtractedTransaction[]>;
}
