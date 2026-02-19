import type { AIProvider } from "./types";
import { createPerplexityProvider } from "./providers/perplexity";
import { createGroqProvider } from "./providers/groq";

export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER;
  const apiKey = process.env.AI_API_KEY;

  if (!apiKey) {
    throw new Error("AI_API_KEY environment variable is not set");
  }

  switch (provider) {
    case "perplexity":
      return createPerplexityProvider(apiKey);
    case "groq":
      return createGroqProvider(apiKey);
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}

export type { AIProvider, ExtractedTransaction, QuickAddResult } from "./types";
