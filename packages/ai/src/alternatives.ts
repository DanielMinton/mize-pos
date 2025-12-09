import { z } from "zod";
import type { AIClient } from "./client";
import { EIGHTY_SIX_ALTERNATIVES_PROMPT } from "./prompts";

export const alternativeSchema = z.object({
  alternative: z.string(),
  reason: z.string(),
  upsell: z.string().optional(),
});

export type EightySixAlternative = z.infer<typeof alternativeSchema>;

export interface EightySixContext {
  unavailableItem: string;
  unavailableDescription?: string;
  availableItems: Array<{
    name: string;
    description: string;
    price: number;
    category: string;
  }>;
  guestOrders?: string[]; // What else they ordered
}

export async function suggestAlternative(
  client: AIClient,
  context: EightySixContext
): Promise<EightySixAlternative> {
  const availableList = context.availableItems
    .slice(0, 10) // Limit for token efficiency
    .map((item) => `- ${item.name} ($${item.price}): ${item.description}`)
    .join("\n");

  const message = await client.anthropic.messages.create({
    model: client.model,
    max_tokens: 256,
    system: EIGHTY_SIX_ALTERNATIVES_PROMPT,
    messages: [
      {
        role: "user",
        content: `86'd Item: ${context.unavailableItem}
${context.unavailableDescription ? `Description: ${context.unavailableDescription}` : ""}
${context.guestOrders?.length ? `Guest also ordered: ${context.guestOrders.join(", ")}` : ""}

Available alternatives:
${availableList}

Suggest the best alternative.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type");
  }

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      alternative: context.availableItems[0]?.name || "Chef's recommendation",
      reason: "Our chef recommends this as a great alternative.",
    };
  }

  return alternativeSchema.parse(JSON.parse(jsonMatch[0]));
}
