import { z } from "zod";
import type { AIClient } from "./client";
import { SPECIALS_SYSTEM_PROMPT } from "./prompts";

export const specialSuggestionSchema = z.object({
  name: z.string(),
  description: z.string(),
  keyIngredients: z.array(z.string()),
  suggestedPrice: z.number(),
  estimatedCost: z.number(),
  costPercentage: z.number(),
  reasoning: z.string(),
  category: z.enum(["appetizer", "entree", "dessert", "drink"]),
});

export type SpecialSuggestion = z.infer<typeof specialSuggestionSchema>;

export interface SpecialsContext {
  locationName: string;
  date: string;
  dayOfWeek: string;
  weather?: {
    condition: string;
    temperature: number;
  };
  inventoryToUse: Array<{
    name: string;
    currentStock: number;
    unit: string;
    daysUntilExpiry?: number;
    reason: "expiring" | "overstocked" | "use_first";
  }>;
  recentSpecials: Array<{
    name: string;
    daysAgo: number;
    performance: "good" | "average" | "poor";
  }>;
  avgEntreePrice: number;
  targetFoodCostPercentage: number;
}

export async function suggestSpecials(
  client: AIClient,
  context: SpecialsContext,
  count: number = 3
): Promise<SpecialSuggestion[]> {
  const inventoryList = context.inventoryToUse
    .map(
      (item) =>
        `- ${item.name}: ${item.currentStock} ${item.unit} (${item.reason}${item.daysUntilExpiry ? `, expires in ${item.daysUntilExpiry} days` : ""})`
    )
    .join("\n");

  const recentList = context.recentSpecials
    .map((s) => `- ${s.name} (${s.daysAgo} days ago, ${s.performance})`)
    .join("\n");

  const message = await client.anthropic.messages.create({
    model: client.model,
    max_tokens: 2048,
    system: SPECIALS_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Generate ${count} special suggestions for today.

Restaurant: ${context.locationName}
Date: ${context.date} (${context.dayOfWeek})
${context.weather ? `Weather: ${context.weather.condition}, ${context.weather.temperature}°F` : ""}

Inventory to prioritize:
${inventoryList}

Recent specials (avoid repetition):
${recentList}

Pricing context:
- Average entree price: $${context.avgEntreePrice.toFixed(2)}
- Target food cost: ${(context.targetFoodCostPercentage * 100).toFixed(0)}%

Respond with a JSON array of ${count} suggestions, each matching this schema:
{
  "name": "string",
  "description": "string",
  "keyIngredients": ["string"],
  "suggestedPrice": number,
  "estimatedCost": number,
  "costPercentage": number (as decimal, e.g., 0.28),
  "reasoning": "string",
  "category": "appetizer|entree|dessert|drink"
}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from AI");
  }

  // Extract JSON array from response
  const jsonMatch = content.text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Could not parse suggestions from AI response");
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return z.array(specialSuggestionSchema).parse(parsed);
}
