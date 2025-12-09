import { z } from "zod";
import type { AIClient } from "./client";
import { TIP_INSIGHTS_SYSTEM_PROMPT } from "./prompts";

export const tipInsightSchema = z.object({
  title: z.string(),
  content: z.string(),
  category: z.enum([
    "upselling",
    "personal_connection",
    "timing",
    "check_presentation",
    "body_language",
  ]),
  researchSource: z.string().optional(),
  expectedImpact: z.string().optional(),
});

export type TipInsight = z.infer<typeof tipInsightSchema>;

export interface TipContext {
  restaurantStyle: "fine_dining" | "casual" | "fast_casual" | "bar";
  averageCheckSize: number;
  averageTipPercentage: number;
  focusArea?: string; // Specific area to focus on
}

export async function getTipInsights(
  client: AIClient,
  context: TipContext,
  count: number = 5
): Promise<TipInsight[]> {
  const message = await client.anthropic.messages.create({
    model: client.model,
    max_tokens: 2048,
    system: TIP_INSIGHTS_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Generate ${count} tip optimization insights for servers.

Restaurant Style: ${context.restaurantStyle}
Average Check Size: $${context.averageCheckSize.toFixed(2)}
Current Average Tip: ${(context.averageTipPercentage * 100).toFixed(1)}%
${context.focusArea ? `Focus Area: ${context.focusArea}` : ""}

Provide ${count} specific, actionable insights. Each should be:
- Backed by research or proven hospitality practices
- Appropriate for the restaurant style
- Actionable (server can implement immediately)
- Specific (not generic advice)

Respond with a JSON array:
[
  {
    "title": "string - short, catchy title",
    "content": "string - detailed explanation (2-3 sentences)",
    "category": "upselling|personal_connection|timing|check_presentation|body_language",
    "researchSource": "string - cite the research/source (optional)",
    "expectedImpact": "string - e.g., '15-20% increase in dessert sales' (optional)"
  }
]`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from AI");
  }

  const jsonMatch = content.text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Could not parse tip insights from AI response");
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return z.array(tipInsightSchema).parse(parsed);
}
