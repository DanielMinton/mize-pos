import { z } from "zod";
import { router, protectedProcedure, createPermissionProcedure } from "../trpc-server";
import { TRPCError } from "@trpc/server";
import {
  createInventoryItemSchema,
  updateInventoryItemSchema,
  recordInventoryCountSchema,
  bulkInventoryCountSchema,
  createFreshnessLogSchema,
  updateFreshnessStatusSchema,
  logWasteSchema,
  createSupplierSchema,
  updateSupplierSchema,
  createPurchaseOrderSchema,
  updatePurchaseOrderStatusSchema,
  receivePurchaseOrderSchema,
  createRecipeSchema,
  updateRecipeSchema,
  addRecipeIngredientSchema,
  updateRecipeIngredientSchema,
} from "@mise-pos/types";
import { PERMISSIONS } from "@mise-pos/types";

const inventoryViewProcedure = createPermissionProcedure(PERMISSIONS.INVENTORY_VIEW);
const inventoryCountProcedure = createPermissionProcedure(PERMISSIONS.INVENTORY_COUNT);
const inventoryOrderProcedure = createPermissionProcedure(PERMISSIONS.INVENTORY_ORDER);
const inventoryReceiveProcedure = createPermissionProcedure(PERMISSIONS.INVENTORY_RECEIVE);
const inventoryWasteProcedure = createPermissionProcedure(PERMISSIONS.INVENTORY_WASTE);
const inventoryRecipeProcedure = createPermissionProcedure(PERMISSIONS.INVENTORY_RECIPES);

export const inventoryRouter = router({
  // Get all inventory items for a location
  getItems: inventoryViewProcedure
    .input(
      z.object({
        locationId: z.string().cuid(),
        category: z.string().optional(),
        lowStock: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.prisma.inventoryItem.findMany({
        where: {
          locationId: input.locationId,
          isActive: true,
          ...(input.category ? { category: input.category } : {}),
        },
        include: {
          supplier: true,
        },
        orderBy: [{ category: "asc" }, { name: "asc" }],
      });

      // Filter low stock if requested
      if (input.lowStock) {
        return items.filter((item: typeof items[number]) => {
          if (!item.reorderPoint) return false;
          return Number(item.currentStock) <= Number(item.reorderPoint);
        });
      }

      return items;
    }),

  // Get single inventory item with history
  getItem: inventoryViewProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const item = await ctx.prisma.inventoryItem.findUnique({
        where: { id: input.id },
        include: {
          supplier: true,
          counts: {
            orderBy: { countedAt: "desc" },
            take: 20,
            include: {
              user: {
                select: { firstName: true, lastName: true },
              },
            },
          },
          freshnessLogs: {
            where: { status: { not: "EXPIRED" } },
            orderBy: { receivedAt: "desc" },
          },
          wasteLogs: {
            orderBy: { createdAt: "desc" },
            take: 20,
            include: {
              loggedBy: {
                select: { firstName: true, lastName: true },
              },
            },
          },
        },
      });

      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
      }

      return item;
    }),

  // Create inventory item
  createItem: inventoryCountProcedure
    .input(createInventoryItemSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.inventoryItem.create({
        data: input,
      });
    }),

  // Update inventory item
  updateItem: inventoryCountProcedure
    .input(updateInventoryItemSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.inventoryItem.update({
        where: { id },
        data,
      });
    }),

  // Record inventory count
  recordCount: inventoryCountProcedure
    .input(recordInventoryCountSchema)
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.prisma.inventoryItem.findUnique({
        where: { id: input.inventoryItemId },
      });

      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
      }

      const previousCount = Number(item.currentStock);
      const variance = input.newCount - previousCount;

      // Create count record
      await ctx.prisma.inventoryCount.create({
        data: {
          inventoryItemId: input.inventoryItemId,
          countedBy: ctx.user.id,
          previousCount,
          newCount: input.newCount,
          variance,
          notes: input.notes,
        },
      });

      // Update current stock
      await ctx.prisma.inventoryItem.update({
        where: { id: input.inventoryItemId },
        data: { currentStock: input.newCount },
      });

      return { success: true, variance };
    }),

  // Bulk inventory count
  bulkCount: inventoryCountProcedure
    .input(bulkInventoryCountSchema)
    .mutation(async ({ ctx, input }) => {
      const results = await Promise.all(
        input.counts.map(async (count) => {
          const item = await ctx.prisma.inventoryItem.findUnique({
            where: { id: count.inventoryItemId },
          });

          if (!item) return { success: false, itemId: count.inventoryItemId };

          const previousCount = Number(item.currentStock);
          const variance = count.newCount - previousCount;

          await ctx.prisma.inventoryCount.create({
            data: {
              inventoryItemId: count.inventoryItemId,
              countedBy: ctx.user.id,
              previousCount,
              newCount: count.newCount,
              variance,
              notes: count.notes,
            },
          });

          await ctx.prisma.inventoryItem.update({
            where: { id: count.inventoryItemId },
            data: { currentStock: count.newCount },
          });

          return { success: true, itemId: count.inventoryItemId, variance };
        })
      );

      return results;
    }),

  // Log freshness batch
  logFreshness: inventoryReceiveProcedure
    .input(createFreshnessLogSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.freshnessLog.create({
        data: input,
      });
    }),

  // Update freshness status
  updateFreshnessStatus: inventoryCountProcedure
    .input(updateFreshnessStatusSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.freshnessLog.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  // Get freshness alerts
  getFreshnessAlerts: inventoryViewProcedure
    .input(z.object({ locationId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      return ctx.prisma.freshnessLog.findMany({
        where: {
          inventoryItem: { locationId: input.locationId },
          status: { in: ["USE_FIRST", "EXPIRING_SOON"] },
        },
        include: {
          inventoryItem: true,
        },
        orderBy: { expiresAt: "asc" },
      });
    }),

  // Log waste
  logWaste: inventoryWasteProcedure
    .input(logWasteSchema)
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.prisma.inventoryItem.findUnique({
        where: { id: input.inventoryItemId },
      });

      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
      }

      // Calculate waste cost
      const cost = input.quantity * Number(item.unitCost);

      // Create waste log
      const wasteLog = await ctx.prisma.wasteLog.create({
        data: {
          inventoryItemId: input.inventoryItemId,
          quantity: input.quantity,
          reason: input.reason,
          notes: input.notes,
          cost,
          loggedById: ctx.user.id,
        },
      });

      // Reduce stock
      await ctx.prisma.inventoryItem.update({
        where: { id: input.inventoryItemId },
        data: {
          currentStock: {
            decrement: input.quantity,
          },
        },
      });

      return wasteLog;
    }),

  // Get suppliers
  getSuppliers: inventoryViewProcedure.query(async ({ ctx }) => {
    return ctx.prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  }),

  // Create supplier
  createSupplier: inventoryOrderProcedure
    .input(createSupplierSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.supplier.create({
        data: input,
      });
    }),

  // Update supplier
  updateSupplier: inventoryOrderProcedure
    .input(updateSupplierSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.supplier.update({
        where: { id },
        data,
      });
    }),

  // Get purchase orders
  getPurchaseOrders: inventoryOrderProcedure
    .input(
      z.object({
        locationId: z.string().cuid(),
        status: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.purchaseOrder.findMany({
        where: {
          locationId: input.locationId,
          ...(input.status ? { status: input.status as never } : {}),
        },
        include: {
          supplier: true,
          items: {
            include: { inventoryItem: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  // Create purchase order
  createPurchaseOrder: inventoryOrderProcedure
    .input(createPurchaseOrderSchema)
    .mutation(async ({ ctx, input }) => {
      const { items, ...orderData } = input;

      // Generate order number
      const lastPO = await ctx.prisma.purchaseOrder.findFirst({
        orderBy: { createdAt: "desc" },
      });
      const orderNumber = `PO-${Date.now().toString(36).toUpperCase()}`;

      // Calculate totals
      const subtotal = items.reduce(
        (sum, item) => sum + item.quantity * item.unitCost,
        0
      );

      return ctx.prisma.purchaseOrder.create({
        data: {
          ...orderData,
          orderNumber,
          subtotal,
          total: subtotal, // Tax can be added later
          items: {
            create: items.map((item) => ({
              inventoryItemId: item.inventoryItemId,
              quantity: item.quantity,
              unitCost: item.unitCost,
              totalCost: item.quantity * item.unitCost,
            })),
          },
        },
        include: {
          items: { include: { inventoryItem: true } },
        },
      });
    }),

  // Update PO status
  updatePurchaseOrderStatus: inventoryOrderProcedure
    .input(updatePurchaseOrderStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const data: Record<string, unknown> = { status: input.status };

      if (input.status === "SUBMITTED") {
        data.orderedAt = new Date();
      }

      return ctx.prisma.purchaseOrder.update({
        where: { id: input.id },
        data,
      });
    }),

  // Receive purchase order
  receivePurchaseOrder: inventoryReceiveProcedure
    .input(receivePurchaseOrderSchema)
    .mutation(async ({ ctx, input }) => {
      // Update PO
      await ctx.prisma.purchaseOrder.update({
        where: { id: input.id },
        data: {
          status: "RECEIVED",
          receivedAt: new Date(),
        },
      });

      // Update each item
      for (const item of input.items) {
        const poItem = await ctx.prisma.purchaseOrderItem.update({
          where: { id: item.purchaseOrderItemId },
          data: { receivedQuantity: item.receivedQuantity },
        });

        // Update inventory stock
        await ctx.prisma.inventoryItem.update({
          where: { id: poItem.inventoryItemId },
          data: {
            currentStock: {
              increment: item.receivedQuantity,
            },
            lastCost: poItem.unitCost,
          },
        });
      }

      return { success: true };
    }),

  // Generate automated requisition
  generateRequisition: inventoryOrderProcedure
    .input(z.object({ locationId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      // Find items below reorder point
      const lowItems = await ctx.prisma.inventoryItem.findMany({
        where: {
          locationId: input.locationId,
          isActive: true,
          reorderPoint: { not: null },
        },
      });

      const itemsToOrder = lowItems.filter((item: typeof lowItems[number]) => {
        if (!item.reorderPoint) return false;
        return Number(item.currentStock) <= Number(item.reorderPoint);
      });

      if (itemsToOrder.length === 0) {
        return { created: false, message: "No items below reorder point" };
      }

      // Group by supplier
      const bySupplier = itemsToOrder.reduce(
        (acc, item) => {
          const supplierId = item.supplierId || "no-supplier";
          if (!acc[supplierId]) acc[supplierId] = [];
          acc[supplierId].push(item);
          return acc;
        },
        {} as Record<string, typeof itemsToOrder>
      );

      // Create POs for each supplier
      const createdPOs = [];
      for (const [supplierId, items] of Object.entries(bySupplier)) {
        if (supplierId === "no-supplier") continue;

        const orderNumber = `PO-AUTO-${Date.now().toString(36).toUpperCase()}`;
        const poItems = items.map((item) => ({
          inventoryItemId: item.id,
          quantity: Number(item.reorderQuantity || item.parLevel || 10),
          unitCost: Number(item.unitCost),
          totalCost:
            Number(item.reorderQuantity || item.parLevel || 10) *
            Number(item.unitCost),
        }));

        const subtotal = poItems.reduce((sum: number, i: typeof poItems[number]) => sum + i.totalCost, 0);

        const po = await ctx.prisma.purchaseOrder.create({
          data: {
            locationId: input.locationId,
            supplierId,
            orderNumber,
            subtotal,
            total: subtotal,
            items: { create: poItems },
          },
        });

        createdPOs.push(po);
      }

      return { created: true, count: createdPOs.length };
    }),

  // Recipe management
  getRecipes: inventoryRecipeProcedure
    .input(z.object({ locationId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.recipe.findMany({
        where: {
          menuItem: {
            category: {
              menu: { locationId: input.locationId },
            },
          },
        },
        include: {
          menuItem: true,
          ingredients: {
            include: { inventoryItem: true },
          },
        },
      });
    }),

  createRecipe: inventoryRecipeProcedure
    .input(createRecipeSchema)
    .mutation(async ({ ctx, input }) => {
      const { ingredients, ...recipeData } = input;

      // Calculate ingredient costs
      const ingredientCosts = await Promise.all(
        ingredients.map(async (ing) => {
          const item = await ctx.prisma.inventoryItem.findUnique({
            where: { id: ing.inventoryItemId },
          });
          return item ? Number(item.unitCost) * ing.quantity : 0;
        })
      );

      const ingredientCost = ingredientCosts.reduce((a: number, b: number) => a + b, 0);
      const costPerPortion = ingredientCost / recipeData.yield;

      const recipe = await ctx.prisma.recipe.create({
        data: {
          ...recipeData,
          ingredientCost,
          costPerPortion,
          ingredients: {
            create: ingredients.map((ing, i) => ({
              ...ing,
              cost: ingredientCosts[i],
            })),
          },
        },
        include: {
          ingredients: { include: { inventoryItem: true } },
        },
      });

      // Update menu item cost
      await ctx.prisma.menuItem.update({
        where: { id: input.menuItemId },
        data: { cost: costPerPortion },
      });

      return recipe;
    }),

  updateRecipe: inventoryRecipeProcedure
    .input(updateRecipeSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.recipe.update({
        where: { id },
        data,
      });
    }),

  addRecipeIngredient: inventoryRecipeProcedure
    .input(addRecipeIngredientSchema)
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.prisma.inventoryItem.findUnique({
        where: { id: input.inventoryItemId },
      });

      const cost = item ? Number(item.unitCost) * input.quantity : 0;

      const ingredient = await ctx.prisma.recipeIngredient.create({
        data: { ...input, cost },
      });

      // Recalculate recipe costs
      await recalculateRecipeCost(ctx.prisma, input.recipeId);

      return ingredient;
    }),

  updateRecipeIngredient: inventoryRecipeProcedure
    .input(updateRecipeIngredientSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const ingredient = await ctx.prisma.recipeIngredient.findUnique({
        where: { id },
        include: { inventoryItem: true },
      });

      if (!ingredient) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const quantity = data.quantity ?? Number(ingredient.quantity);
      const cost = Number(ingredient.inventoryItem.unitCost) * quantity;

      const updated = await ctx.prisma.recipeIngredient.update({
        where: { id },
        data: { ...data, cost },
      });

      await recalculateRecipeCost(ctx.prisma, ingredient.recipeId);

      return updated;
    }),

  removeRecipeIngredient: inventoryRecipeProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const ingredient = await ctx.prisma.recipeIngredient.findUnique({
        where: { id: input.id },
      });

      if (!ingredient) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await ctx.prisma.recipeIngredient.delete({
        where: { id: input.id },
      });

      await recalculateRecipeCost(ctx.prisma, ingredient.recipeId);

      return { success: true };
    }),
});

// Helper to recalculate recipe cost
async function recalculateRecipeCost(
  prisma: typeof import("@mise-pos/database").prisma,
  recipeId: string
) {
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: { ingredients: true },
  });

  if (!recipe) return;

  const ingredientCost = recipe.ingredients.reduce(
    (sum, i) => sum + Number(i.cost),
    0
  );
  const costPerPortion = ingredientCost / Number(recipe.yield);

  await prisma.recipe.update({
    where: { id: recipeId },
    data: { ingredientCost, costPerPortion },
  });

  // Update menu item cost
  await prisma.menuItem.update({
    where: { id: recipe.menuItemId },
    data: { cost: costPerPortion },
  });
}
