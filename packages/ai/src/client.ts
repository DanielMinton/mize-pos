import Anthropic from "@anthropic-ai/sdk";

export interface AIClient {
  anthropic: Anthropic;
  model: string;
}

export function createAIClient(apiKey?: string): AIClient {
  const anthropic = new Anthropic({
    apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
  });

  return {
    anthropic,
    model: "claude-sonnet-4-20250514",
  };
}
