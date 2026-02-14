import type { AIProvider } from "./types";
import { createPerplexityProvider } from "./providers/perplexity";

export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER ?? "perplexity";
  const apiKey = process.env.AI_API_KEY;

  if (!apiKey) {
    throw new Error("AI_API_KEY environment variable is not set");
  }

  switch (provider) {
    case "perplexity":
      return createPerplexityProvider(apiKey);
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}

export type { AIProvider, ExtractedTransaction, QuickAddResult } from "./types";
