import { z } from "zod";
import type { AIClient } from "./client";
import { PREP_LIST_SYSTEM_PROMPT } from "./prompts";

export const prepListItemSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  priority: z.enum(["URGENT", "HIGH", "NORMAL", "LOW"]),
  estimatedMinutes: z.number().optional(),
  dependencies: z.array(z.string()).optional(),
  notes: z.string().optional(),
  station: z.string().optional(),
});

export type PrepListItem = z.infer<typeof prepListItemSchema>;

export interface PrepContext {
  locationName: string;
  date: string;
  dayOfWeek: string;
  expectedCovers: number;
  historicalCoverRange: { low: number; high: number };
  menuItems: Array<{
    name: string;
    expectedOrders: number;
    prepComponents: Array<{
      name: string;
      quantityPerOrder: number;
      unit: string;
      currentPrepLevel: number;
      shelfLifeHours: number;
    }>;
  }>;
  currentInventory: Array<{
    name: string;
    currentStock: number;
    unit: string;
    expiresAt?: string;
  }>;
  events?: string[]; // Special events that might affect volume
}

export async function generatePrepList(
  client: AIClient,
  context: PrepContext
): Promise<PrepListItem[]> {
  const menuItemsText = context.menuItems
    .map((item) => {
      const components = item.prepComponents
        .map(
          (c) =>
            `    - ${c.name}: ${c.quantityPerOrder} ${c.unit}/order, current prep: ${c.currentPrepLevel} ${c.unit}, shelf life: ${c.shelfLifeHours}h`
        )
        .join("\n");
      return `- ${item.name} (expected: ${item.expectedOrders} orders)\n${components}`;
    })
    .join("\n");

  const inventoryText = context.currentInventory
    .map(
      (i) =>
        `- ${i.name}: ${i.currentStock} ${i.unit}${i.expiresAt ? ` (expires: ${i.expiresAt})` : ""}`
    )
    .join("\n");

  const message = await client.anthropic.messages.create({
    model: client.model,
    max_tokens: 2048,
    system: PREP_LIST_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Generate a prep list for today.

Location: ${context.locationName}
Date: ${context.date} (${context.dayOfWeek})
Expected Covers: ${context.expectedCovers} (typical range: ${context.historicalCoverRange.low}-${context.historicalCoverRange.high})
${context.events?.length ? `Special Events: ${context.events.join(", ")}` : ""}

Menu Items and Prep Components:
${menuItemsText}

Current Inventory:
${inventoryText}

Generate a prioritized prep list. Respond with a JSON array of tasks:
[
  {
    "name": "string",
    "quantity": number,
    "unit": "string",
    "priority": "URGENT|HIGH|NORMAL|LOW",
    "estimatedMinutes": number (optional),
    "dependencies": ["string"] (optional),
    "notes": "string" (optional),
    "station": "string" (optional)
  }
]

Order by priority, then dependencies.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from AI");
  }

  const jsonMatch = content.text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Could not parse prep list from AI response");
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return z.array(prepListItemSchema).parse(parsed);
}
