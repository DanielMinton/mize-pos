import { z } from "zod";
import type { AIClient } from "./client";
import { QUERY_SYSTEM_PROMPT } from "./prompts";

export const queryResultSchema = z.object({
  answer: z.string(),
  metrics: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
      trend: z.enum(["up", "down", "flat"]).optional(),
      trendValue: z.string().optional(),
    })
  ).optional(),
  suggestedQueries: z.array(z.string()).optional(),
  chartType: z.enum(["bar", "line", "pie", "none"]).optional(),
});

export type QueryResult = z.infer<typeof queryResultSchema>;

export interface QueryContext {
  locationId: string;
  locationName: string;
  currentDate: string;
  currentTime: string;
  recentSales?: {
    today: number;
    yesterday: number;
    lastWeek: number;
  };
  activeOrders?: number;
  currentCovers?: number;
}

export async function queryRestaurantData(
  client: AIClient,
  query: string,
  context: QueryContext,
  dataSnapshot: string // Pre-formatted relevant data
): Promise<QueryResult> {
  const message = await client.anthropic.messages.create({
    model: client.model,
    max_tokens: 1024,
    system: QUERY_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Context:
Location: ${context.locationName}
Date: ${context.currentDate}
Time: ${context.currentTime}
${context.recentSales ? `Today's Sales: $${context.recentSales.today.toFixed(2)}` : ""}
${context.activeOrders ? `Active Orders: ${context.activeOrders}` : ""}
${context.currentCovers ? `Current Covers: ${context.currentCovers}` : ""}

Available Data:
${dataSnapshot}

User Query: ${query}

Respond with a JSON object matching this schema:
{
  "answer": "string - the main answer",
  "metrics": [{ "label": "string", "value": "string", "trend": "up|down|flat", "trendValue": "string" }],
  "suggestedQueries": ["string - follow-up query suggestions"],
  "chartType": "bar|line|pie|none - if data would benefit from visualization"
}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from AI");
  }

  // Extract JSON from response
  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    // If no JSON found, return the text as the answer
    return {
      answer: content.text,
    };
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return queryResultSchema.parse(parsed);
}
