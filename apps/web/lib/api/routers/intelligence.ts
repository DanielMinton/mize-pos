import { z } from "zod";
import { router, protectedProcedure, createPermissionProcedure } from "../trpc-server";
import { TRPCError } from "@trpc/server";
import { PERMISSIONS } from "@mise-pos/types";
import {
  createAIClient,
  queryRestaurantData,
  suggestSpecials,
  generatePrepList,
  getTipInsights,
} from "@mise-pos/ai";

// Type definitions for AI context objects
interface QueryContext {
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

interface SpecialsContext {
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

const intelligenceViewProcedure = createPermissionProcedure(PERMISSIONS.INTELLIGENCE_VIEW);
const intelligenceQueryProcedure = createPermissionProcedure(PERMISSIONS.INTELLIGENCE_QUERY);

// Create a cached AI client
let aiClient: ReturnType<typeof createAIClient> | null = null;
function getAIClient() {
  if (!aiClient) {
    aiClient = createAIClient();
  }
  return aiClient;
}

export const intelligenceRouter = router({
  // Natural language query
  query: intelligenceQueryProcedure
    .input(
      z.object({
        locationId: z.string().cuid(),
        query: z.string().min(1).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const client = getAIClient();

      // Get location info
      const location = await ctx.prisma.location.findUnique({
        where: { id: input.locationId },
        include: { organization: true },
      });

      if (!location) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Location not found" });
      }

      // Get current context
      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);

      // Get recent sales data
      const [todaySales, yesterdaySales, lastWeekSales, activeOrders] = await Promise.all([
        ctx.prisma.order.aggregate({
          where: {
            locationId: input.locationId,
            status: "CLOSED",
            closedAt: { gte: today },
          },
          _sum: { subtotal: true },
        }),
        ctx.prisma.order.aggregate({
          where: {
            locationId: input.locationId,
            status: "CLOSED",
            closedAt: { gte: yesterday, lt: today },
          },
          _sum: { subtotal: true },
        }),
        ctx.prisma.order.aggregate({
          where: {
            locationId: input.locationId,
            status: "CLOSED",
            closedAt: {
              gte: lastWeek,
              lt: new Date(lastWeek.getTime() + 24 * 60 * 60 * 1000),
            },
          },
          _sum: { subtotal: true },
        }),
        ctx.prisma.order.count({
          where: {
            locationId: input.locationId,
            status: { in: ["OPEN", "SENT", "IN_PROGRESS", "READY", "SERVED"] },
          },
        }),
      ]);

      // Build data snapshot based on query keywords
      const queryLower = input.query.toLowerCase();
      const dataSnapshotParts: string[] = [];

      // Sales data
      if (queryLower.includes("sale") || queryLower.includes("revenue") || queryLower.includes("money")) {
        const salesData = await getSalesSnapshot(ctx.prisma, input.locationId);
        dataSnapshotParts.push(salesData);
      }

      // Menu/item data
      if (queryLower.includes("item") || queryLower.includes("menu") || queryLower.includes("sold") || queryLower.includes("best") || queryLower.includes("popular")) {
        const menuData = await getMenuSnapshot(ctx.prisma, input.locationId);
        dataSnapshotParts.push(menuData);
      }

      // Inventory data
      if (queryLower.includes("inventory") || queryLower.includes("stock") || queryLower.includes("low") || queryLower.includes("order")) {
        const inventoryData = await getInventorySnapshot(ctx.prisma, input.locationId);
        dataSnapshotParts.push(inventoryData);
      }

      // Labor data
      if (queryLower.includes("labor") || queryLower.includes("staff") || queryLower.includes("server") || queryLower.includes("employee")) {
        const laborData = await getLaborSnapshot(ctx.prisma, input.locationId);
        dataSnapshotParts.push(laborData);
      }

      // Default: include a general snapshot
      if (dataSnapshotParts.length === 0) {
        const generalData = await getGeneralSnapshot(ctx.prisma, input.locationId);
        dataSnapshotParts.push(generalData);
      }

      const context: QueryContext = {
        locationId: input.locationId,
        locationName: location.name,
        currentDate: now.toISOString().split("T")[0],
        currentTime: now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        recentSales: {
          today: Number(todaySales._sum.subtotal) || 0,
          yesterday: Number(yesterdaySales._sum.subtotal) || 0,
          lastWeek: Number(lastWeekSales._sum.subtotal) || 0,
        },
        activeOrders,
      };

      // Log the query
      await ctx.prisma.queryLog.create({
        data: {
          locationId: input.locationId,
          userId: ctx.user.id,
          query: input.query,
          response: "", // Will be updated after response
        },
      });

      try {
        const result = await queryRestaurantData(
          client,
          input.query,
          context,
          dataSnapshotParts.join("\n\n")
        );

        // Update query log with response
        // (In production, you'd want to do this with the actual queryLogId)

        return result;
      } catch (error) {
        console.error("AI query error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to process query",
        });
      }
    }),

  // Get AI-suggested specials
  getSuggestions: intelligenceViewProcedure
    .input(
      z.object({
        locationId: z.string().cuid(),
        count: z.number().min(1).max(5).default(3),
      })
    )
    .query(async ({ ctx, input }) => {
      const client = getAIClient();

      const location = await ctx.prisma.location.findUnique({
        where: { id: input.locationId },
      });

      if (!location) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Location not found" });
      }

      const now = new Date();
      const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long" });

      // Get inventory items that need to be used
      const inventoryToUse = await ctx.prisma.inventoryItem.findMany({
        where: {
          locationId: input.locationId,
          isActive: true,
          OR: [
            // Items with upcoming expiration
            {
              freshnessLogs: {
                some: {
                  status: { in: ["USE_FIRST", "EXPIRING_SOON"] },
                },
              },
            },
            // Items significantly over par
            {
              currentStock: { gt: 0 },
            },
          ],
        },
        include: {
          freshnessLogs: {
            where: { status: { in: ["USE_FIRST", "EXPIRING_SOON"] } },
            orderBy: { expiresAt: "asc" },
            take: 1,
          },
        },
        take: 15,
      });

      // Calculate days until expiry and determine reason
      const processedInventory = inventoryToUse
        .map((item: typeof inventoryToUse[number]) => {
          const freshLog = item.freshnessLogs[0];
          let reason: "expiring" | "overstocked" | "use_first" = "overstocked";
          let daysUntilExpiry: number | undefined;

          if (freshLog) {
            daysUntilExpiry = freshLog.expiresAt
              ? Math.ceil((freshLog.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
              : undefined;

            if (freshLog.status === "USE_FIRST") {
              reason = "use_first";
            } else if (freshLog.status === "EXPIRING_SOON") {
              reason = "expiring";
            }
          }

          // Check if overstocked
          if (item.parLevel && Number(item.currentStock) > Number(item.parLevel) * 1.5) {
            reason = "overstocked";
          }

          return {
            name: item.name,
            currentStock: Number(item.currentStock),
            unit: item.unit,
            daysUntilExpiry,
            reason,
          };
        })
        .filter((item: { currentStock: number }) => item.currentStock > 0)
        .slice(0, 10);

      // Get recent specials
      const recentSpecials = await ctx.prisma.specialSuggestion.findMany({
        where: {
          locationId: input.locationId,
          createdAt: { gte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      });

      // Get average entree price
      const entrees = await ctx.prisma.menuItem.findMany({
        where: {
          category: {
            menu: { locationId: input.locationId },
            name: { contains: "Entree", mode: "insensitive" },
          },
          isActive: true,
        },
        select: { price: true },
      });

      const avgEntreePrice = entrees.length > 0
        ? entrees.reduce((sum: number, e: typeof entrees[number]) => sum + Number(e.price), 0) / entrees.length
        : 25;

      const context: SpecialsContext = {
        locationName: location.name,
        date: now.toISOString().split("T")[0],
        dayOfWeek,
        inventoryToUse: processedInventory,
        recentSpecials: recentSpecials.map((s: typeof recentSpecials[number]) => ({
          name: s.name,
          daysAgo: Math.ceil((now.getTime() - s.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
          performance: "average" as const, // In production, track actual performance
        })),
        avgEntreePrice,
        targetFoodCostPercentage: 0.28,
      };

      try {
        const suggestions = await suggestSpecials(client, context, input.count);

        // Store suggestions in database
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        await ctx.prisma.specialSuggestion.createMany({
          data: suggestions.map((s: typeof suggestions[number]) => ({
            locationId: input.locationId,
            name: s.name,
            description: s.description,
            suggestedPrice: s.suggestedPrice,
            estimatedCost: s.estimatedCost,
            margin: s.costPercentage,
            reasoning: s.reasoning,
            ingredients: s.keyIngredients,
            suggestedFor: today,
          })),
        });

        return suggestions;
      } catch (error) {
        console.error("AI suggestions error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate suggestions",
        });
      }
    }),

  // Get prep list generated by AI
  getPrepList: intelligenceViewProcedure
    .input(
      z.object({
        locationId: z.string().cuid(),
        forecastCovers: z.number().min(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const client = getAIClient();

      const location = await ctx.prisma.location.findUnique({
        where: { id: input.locationId },
      });

      if (!location) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Location not found" });
      }

      const now = new Date();
      const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long" });
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Get historical sales mix (what sells)
      const salesMix = await ctx.prisma.orderItem.groupBy({
        by: ["menuItemId"],
        where: {
          order: {
            locationId: input.locationId,
            status: "CLOSED",
            closedAt: { gte: weekAgo },
          },
          status: { not: "VOID" },
        },
        _sum: { quantity: true },
      });

      // Get menu items with recipes
      const menuItems = await ctx.prisma.menuItem.findMany({
        where: {
          category: {
            menu: { locationId: input.locationId },
          },
          isActive: true,
        },
        include: {
          recipe: {
            include: {
              ingredients: {
                include: { inventoryItem: true },
              },
            },
          },
        },
      });

      // Get current inventory
      const inventory = await ctx.prisma.inventoryItem.findMany({
        where: {
          locationId: input.locationId,
          isActive: true,
        },
        include: {
          freshnessLogs: {
            where: { status: { not: "EXPIRED" } },
            orderBy: { expiresAt: "asc" },
            take: 1,
          },
        },
      });

      // Build context for AI
      const menuItemsContext = menuItems
        .filter((item: typeof menuItems[number]) => item.recipe)
        .map((item: typeof menuItems[number]) => {
          const salesData = salesMix.find((s: typeof salesMix[number]) => s.menuItemId === item.id);
          const avgDailyOrders = (Number(salesData?._sum.quantity) || 0) / 7;

          return {
            name: item.name,
            expectedOrders: Math.ceil(avgDailyOrders * (input.forecastCovers / 100)),
            prepComponents: item.recipe?.ingredients.map((ing: NonNullable<typeof item.recipe>["ingredients"][number]) => ({
              name: ing.inventoryItem.name,
              quantityPerOrder: Number(ing.quantity),
              unit: ing.inventoryItem.unit,
              currentPrepLevel: Number(ing.inventoryItem.currentStock),
              shelfLifeHours: 72, // Default 3 days
            })) || [],
          };
        });

      const currentInventory = inventory.map((item: typeof inventory[number]) => ({
        name: item.name,
        currentStock: Number(item.currentStock),
        unit: item.unit,
        expiresAt: item.freshnessLogs[0]?.expiresAt?.toISOString(),
      }));

      try {
        const prepList = await generatePrepList(client, {
          locationName: location.name,
          date: now.toISOString().split("T")[0],
          dayOfWeek,
          expectedCovers: input.forecastCovers,
          historicalCoverRange: { low: Math.round(input.forecastCovers * 0.8), high: Math.round(input.forecastCovers * 1.2) },
          menuItems: menuItemsContext,
          currentInventory,
        });

        return prepList;
      } catch (error) {
        console.error("AI prep list error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate prep list",
        });
      }
    }),

  // Get tip insights
  getTipInsights: intelligenceViewProcedure
    .input(
      z.object({
        locationId: z.string().cuid(),
        category: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const client = getAIClient();

      // Get average check size and tip percentage from recent orders
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const recentOrders = await ctx.prisma.order.findMany({
        where: {
          locationId: input.locationId,
          status: "CLOSED",
          closedAt: { gte: weekAgo },
        },
        select: {
          subtotal: true,
          tipAmount: true,
        },
      });

      const totalSubtotal = recentOrders.reduce((s: number, o: typeof recentOrders[number]) => s + Number(o.subtotal), 0);
      const totalTips = recentOrders.reduce((s: number, o: typeof recentOrders[number]) => s + Number(o.tipAmount), 0);
      const avgCheckSize = recentOrders.length > 0 ? totalSubtotal / recentOrders.length : 50;
      const avgTipPercentage = totalSubtotal > 0 ? totalTips / totalSubtotal : 0.18;

      try {
        const insights = await getTipInsights(client, {
          restaurantStyle: "casual", // Could be fetched from location settings
          averageCheckSize: avgCheckSize,
          averageTipPercentage: avgTipPercentage,
          focusArea: input.category,
        });
        return insights;
      } catch (error) {
        console.error("AI tip insights error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get tip insights",
        });
      }
    }),

  // Get query history
  getQueryHistory: intelligenceViewProcedure
    .input(
      z.object({
        locationId: z.string().cuid(),
        limit: z.number().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.queryLog.findMany({
        where: { locationId: input.locationId },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
    }),

  // Get stored special suggestions
  getStoredSuggestions: intelligenceViewProcedure
    .input(
      z.object({
        locationId: z.string().cuid(),
        daysBack: z.number().default(7),
      })
    )
    .query(async ({ ctx, input }) => {
      const since = new Date();
      since.setDate(since.getDate() - input.daysBack);

      return ctx.prisma.specialSuggestion.findMany({
        where: {
          locationId: input.locationId,
          createdAt: { gte: since },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  // Menu engineering analysis
  getMenuEngineering: intelligenceViewProcedure
    .input(
      z.object({
        locationId: z.string().cuid(),
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const start = new Date(input.startDate);
      const end = new Date(input.endDate);
      end.setHours(23, 59, 59, 999);

      // Get menu items with sales data
      const items = await ctx.prisma.menuItem.findMany({
        where: {
          category: {
            menu: { locationId: input.locationId },
          },
          isActive: true,
        },
        include: {
          category: true,
          _count: {
            select: {
              orderItems: {
                where: {
                  order: {
                    status: "CLOSED",
                    closedAt: { gte: start, lte: end },
                  },
                  status: { not: "VOID" },
                },
              },
            },
          },
        },
      });

      // Get order items for revenue calculation
      const orderItems = await ctx.prisma.orderItem.groupBy({
        by: ["menuItemId"],
        where: {
          order: {
            locationId: input.locationId,
            status: "CLOSED",
            closedAt: { gte: start, lte: end },
          },
          status: { not: "VOID" },
        },
        _sum: { quantity: true, totalPrice: true },
      });

      const orderItemMap = new Map<string, typeof orderItems[number]>(orderItems.map((o: typeof orderItems[number]) => [o.menuItemId, o]));

      // Calculate metrics for each item
      const itemMetrics = items.map((item: typeof items[number]) => {
        const orderData = orderItemMap.get(item.id);
        const quantitySold = Number(orderData?._sum.quantity) || 0;
        const revenue = Number(orderData?._sum.totalPrice) || 0;
        const cost = item.cost ? Number(item.cost) : Number(item.price) * 0.3;
        const price = Number(item.price);
        const contributionMargin = price - cost;
        const totalContribution = contributionMargin * quantitySold;

        return {
          id: item.id,
          name: item.name,
          category: item.category.name,
          quantitySold,
          revenue,
          price,
          cost,
          contributionMargin,
          totalContribution,
        };
      });

      // Calculate category averages
      const categories = [...new Set<string>(itemMetrics.map((i: typeof itemMetrics[number]) => i.category))];
      const categoryAverages = categories.map((cat: string) => {
        const catItems = itemMetrics.filter((i: typeof itemMetrics[number]) => i.category === cat);
        const avgQuantity = catItems.reduce((s: number, i: typeof catItems[number]) => s + i.quantitySold, 0) / catItems.length;
        const avgMargin = catItems.reduce((s: number, i: typeof catItems[number]) => s + i.contributionMargin, 0) / catItems.length;
        return { category: cat, avgQuantity, avgMargin };
      });

      // Classify items using menu engineering matrix
      const classifiedItems = itemMetrics.map((item: typeof itemMetrics[number]) => {
        const catAvg = categoryAverages.find((c: typeof categoryAverages[number]) => c.category === item.category);
        const isHighPopularity = item.quantitySold >= (catAvg?.avgQuantity || 0);
        const isHighProfit = item.contributionMargin >= (catAvg?.avgMargin || 0);

        let classification: "star" | "plowhorse" | "puzzle" | "dog";
        let recommendation: string;

        if (isHighPopularity && isHighProfit) {
          classification = "star";
          recommendation = "Maintain quality and visibility. Consider slight price increase.";
        } else if (isHighPopularity && !isHighProfit) {
          classification = "plowhorse";
          recommendation = "Increase price or reduce portion/ingredients to improve margin.";
        } else if (!isHighPopularity && isHighProfit) {
          classification = "puzzle";
          recommendation = "Increase visibility: better menu placement, staff recommendations, or rename.";
        } else {
          classification = "dog";
          recommendation = "Consider removing or completely reimagining this item.";
        }

        return {
          ...item,
          classification,
          recommendation,
        };
      });

      return {
        items: classifiedItems,
        summary: {
          stars: classifiedItems.filter((i: typeof classifiedItems[number]) => i.classification === "star").length,
          plowhorses: classifiedItems.filter((i: typeof classifiedItems[number]) => i.classification === "plowhorse").length,
          puzzles: classifiedItems.filter((i: typeof classifiedItems[number]) => i.classification === "puzzle").length,
          dogs: classifiedItems.filter((i: typeof classifiedItems[number]) => i.classification === "dog").length,
        },
        categoryAverages,
      };
    }),
});

// Helper functions to build data snapshots
async function getSalesSnapshot(
  prisma: typeof import("@mise-pos/database").prisma,
  locationId: string
): Promise<string> {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [todayOrders, weekOrders] = await Promise.all([
    prisma.order.findMany({
      where: {
        locationId,
        status: "CLOSED",
        closedAt: { gte: today },
      },
    }),
    prisma.order.findMany({
      where: {
        locationId,
        status: "CLOSED",
        closedAt: { gte: weekAgo },
      },
    }),
  ]);

  const todayTotal = todayOrders.reduce((s: number, o: typeof todayOrders[number]) => s + Number(o.subtotal), 0);
  const todayGuests = todayOrders.reduce((s: number, o: typeof todayOrders[number]) => s + o.guestCount, 0);
  const weekTotal = weekOrders.reduce((s: number, o: typeof weekOrders[number]) => s + Number(o.subtotal), 0);
  const weekAvg = weekTotal / 7;

  return `SALES DATA:
Today: $${todayTotal.toFixed(2)} from ${todayOrders.length} orders (${todayGuests} guests)
Today's check average: $${todayOrders.length > 0 ? (todayTotal / todayOrders.length).toFixed(2) : "0.00"}
7-day total: $${weekTotal.toFixed(2)}
7-day daily average: $${weekAvg.toFixed(2)}`;
}

async function getMenuSnapshot(
  prisma: typeof import("@mise-pos/database").prisma,
  locationId: string
): Promise<string> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const topItems = await prisma.orderItem.groupBy({
    by: ["menuItemId"],
    where: {
      order: {
        locationId,
        status: "CLOSED",
        closedAt: { gte: weekAgo },
      },
      status: { not: "VOID" },
    },
    _sum: { quantity: true, totalPrice: true },
    orderBy: { _sum: { totalPrice: "desc" } },
    take: 10,
  });

  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: topItems.map((t: typeof topItems[number]) => t.menuItemId) } },
  });

  const menuMap = new Map(menuItems.map((m: typeof menuItems[number]) => [m.id, m.name]));

  const itemsList = topItems
    .map(
      (item: typeof topItems[number], i: number) =>
        `${i + 1}. ${menuMap.get(item.menuItemId) || "Unknown"}: ${item._sum.quantity} sold, $${Number(item._sum.totalPrice).toFixed(2)} revenue`
    )
    .join("\n");

  return `TOP SELLING ITEMS (7 days):
${itemsList}`;
}

async function getInventorySnapshot(
  prisma: typeof import("@mise-pos/database").prisma,
  locationId: string
): Promise<string> {
  const lowItems = await prisma.inventoryItem.findMany({
    where: {
      locationId,
      isActive: true,
    },
  });

  const lowStock = lowItems.filter(
    (i: typeof lowItems[number]) => i.reorderPoint && Number(i.currentStock) <= Number(i.reorderPoint)
  );

  const expiringItems = await prisma.freshnessLog.findMany({
    where: {
      inventoryItem: { locationId },
      status: { in: ["USE_FIRST", "EXPIRING_SOON"] },
    },
    include: { inventoryItem: true },
    take: 10,
  });

  return `INVENTORY ALERTS:
Low stock items: ${lowStock.length}
${lowStock.slice(0, 5).map((i: typeof lowStock[number]) => `- ${i.name}: ${Number(i.currentStock)} ${i.unit} (reorder at ${Number(i.reorderPoint)})`).join("\n")}

Expiring soon:
${expiringItems.map((e: typeof expiringItems[number]) => `- ${e.inventoryItem.name}: ${e.status}`).join("\n") || "None"}`;
}

async function getLaborSnapshot(
  prisma: typeof import("@mise-pos/database").prisma,
  locationId: string
): Promise<string> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const shifts = await prisma.shift.findMany({
    where: {
      locationId,
      scheduledStart: { gte: today, lt: tomorrow },
    },
    include: {
      user: { select: { firstName: true, lastName: true } },
    },
  });

  // Get clocked-in users by checking shifts with clockedInAt but no clockedOutAt
  const clockedInShifts = await prisma.shift.findMany({
    where: {
      locationId,
      clockedInAt: { not: null },
      clockedOutAt: null,
    },
    include: {
      user: { select: { firstName: true, lastName: true } },
    },
  });

  return `LABOR STATUS:
Scheduled shifts today: ${shifts.length}
${shifts.map((s: typeof shifts[number]) => `- ${s.user.firstName} ${s.user.lastName} (${s.role || "Staff"})`).join("\n")}

Currently clocked in: ${clockedInShifts.length}
${clockedInShifts.map((s: typeof clockedInShifts[number]) => `- ${s.user.firstName} ${s.user.lastName}`).join("\n")}`;
}

async function getGeneralSnapshot(
  prisma: typeof import("@mise-pos/database").prisma,
  locationId: string
): Promise<string> {
  const [sales, menu, inventory, labor] = await Promise.all([
    getSalesSnapshot(prisma, locationId),
    getMenuSnapshot(prisma, locationId),
    getInventorySnapshot(prisma, locationId),
    getLaborSnapshot(prisma, locationId),
  ]);

  return `${sales}\n\n${menu}\n\n${inventory}\n\n${labor}`;
}
