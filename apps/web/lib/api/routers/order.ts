import { z } from "zod";
import { router, protectedProcedure, createPermissionProcedure } from "../trpc-server";
import { TRPCError } from "@trpc/server";
import {
  broadcast,
  broadcastOrderCreated,
  broadcastOrderUpdated,
  broadcastOrderFired,
} from "@/lib/realtime/event-emitter";
import {
  createOrderSchema,
  updateOrderSchema,
  addOrderItemSchema,
  updateOrderItemSchema,
  fireOrderItemsSchema,
  fireOrderSchema,
  holdOrderItemsSchema,
  bumpOrderItemSchema,
  serveOrderItemSchema,
  voidOrderItemSchema,
  addCompSchema,
  addDiscountSchema,
  addPaymentSchema,
  splitCheckSchema,
  splitCheckBySeatSchema,
  closeOrderSchema,
  transferTableSchema,
  OrderStatus,
  OrderItemStatus,
  DiscountType,
} from "@mise-pos/types";
import { PERMISSIONS } from "@mise-pos/types";
import type { Prisma } from "@mise-pos/database";

const orderCreateProcedure = createPermissionProcedure(PERMISSIONS.ORDERS_CREATE);
const orderVoidProcedure = createPermissionProcedure(PERMISSIONS.ORDERS_VOID);
const orderCompProcedure = createPermissionProcedure(PERMISSIONS.ORDERS_COMP);
const orderDiscountProcedure = createPermissionProcedure(PERMISSIONS.ORDERS_DISCOUNT);

export const orderRouter = router({
  // Get open orders for a location
  getOpenOrders: protectedProcedure
    .input(z.object({ locationId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.order.findMany({
        where: {
          locationId: input.locationId,
          status: { in: ["OPEN", "SENT", "IN_PROGRESS", "READY", "SERVED"] },
        },
        include: {
          table: true,
          server: {
            select: { firstName: true, lastName: true },
          },
          items: {
            include: {
              menuItem: true,
              modifiers: true,
            },
          },
        },
        orderBy: { openedAt: "desc" },
      });
    }),

  // Get single order with all details
  getOrder: protectedProcedure
    .input(z.object({ orderId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.prisma.order.findUnique({
        where: { id: input.orderId },
        include: {
          table: true,
          server: {
            select: { id: true, firstName: true, lastName: true },
          },
          items: {
            include: {
              menuItem: {
                include: { station: true },
              },
              modifiers: true,
              check: true,
            },
            orderBy: [{ course: "asc" }, { seat: "asc" }, { createdAt: "asc" }],
          },
          checks: {
            include: {
              items: true,
              payments: true,
            },
          },
          payments: true,
          voids: true,
          comps: true,
          discounts: true,
        },
      });

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      return order;
    }),

  // Create new order
  createOrder: orderCreateProcedure
    .input(createOrderSchema)
    .mutation(async ({ ctx, input }) => {
      // Generate order number (sequential per location per day)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const lastOrder = await ctx.prisma.order.findFirst({
        where: {
          locationId: input.locationId,
          openedAt: { gte: today },
        },
        orderBy: { orderNumber: "desc" },
      });

      const orderNumber = (lastOrder?.orderNumber ?? 0) + 1;

      const order = await ctx.prisma.order.create({
        data: {
          ...input,
          orderNumber,
        },
        include: {
          table: true,
          server: {
            select: { firstName: true, lastName: true },
          },
        },
      });

      // Emit real-time event
      await broadcastOrderCreated(input.locationId, order.id, ctx.user.id);

      return order;
    }),

  // Update order
  updateOrder: protectedProcedure
    .input(updateOrderSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.order.update({
        where: { id },
        data,
      });
    }),

  // Add item to order
  addItem: orderCreateProcedure
    .input(addOrderItemSchema)
    .mutation(async ({ ctx, input }) => {
      const { orderId, menuItemId, modifiers, ...itemData } = input;

      // Get menu item for pricing
      const menuItem = await ctx.prisma.menuItem.findUnique({
        where: { id: menuItemId },
      });

      if (!menuItem) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Menu item not found" });
      }

      if (menuItem.isEightySixed) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Item is 86'd" });
      }

      // Calculate modifier total
      const modifierTotal =
        modifiers?.reduce((sum, m) => sum + m.priceAdjustment, 0) ?? 0;

      // Calculate total price
      const unitPrice = Number(menuItem.price);
      const totalPrice = (unitPrice + modifierTotal) * itemData.quantity;

      const orderItem = await ctx.prisma.orderItem.create({
        data: {
          orderId,
          menuItemId,
          ...itemData,
          unitPrice: menuItem.price,
          modifierTotal,
          totalPrice,
          modifiers: modifiers
            ? {
                create: modifiers.map((m) => ({
                  modifierId: m.modifierId,
                  name: m.name,
                  priceAdjustment: m.priceAdjustment,
                })),
              }
            : undefined,
        },
        include: {
          menuItem: true,
          modifiers: true,
        },
      });

      // Update order totals
      await updateOrderTotals(ctx.prisma, orderId);

      // Emit real-time event
      const order = await ctx.prisma.order.findUnique({
        where: { id: orderId },
        select: { locationId: true },
      });
      if (order) {
        await broadcast("ITEM_ADDED", order.locationId, orderItem, ctx.user.id);
      }

      return orderItem;
    }),

  // Update order item
  updateItem: protectedProcedure
    .input(updateOrderItemSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const item = await ctx.prisma.orderItem.update({
        where: { id },
        data,
        include: {
          menuItem: true,
          modifiers: true,
        },
      });

      // If quantity changed, recalculate price
      if (data.quantity) {
        const unitPrice = Number(item.unitPrice);
        const modifierTotal = Number(item.modifierTotal);
        const totalPrice = (unitPrice + modifierTotal) * data.quantity;

        await ctx.prisma.orderItem.update({
          where: { id },
          data: { totalPrice },
        });

        await updateOrderTotals(ctx.prisma, item.orderId);
      }

      return item;
    }),

  // Remove item from order
  removeItem: protectedProcedure
    .input(z.object({ orderItemId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.prisma.orderItem.findUnique({
        where: { id: input.orderItemId },
      });

      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
      }

      // Can only remove pending items without void
      if (item.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only remove pending items. Use void for sent items.",
        });
      }

      await ctx.prisma.orderItem.delete({
        where: { id: input.orderItemId },
      });

      await updateOrderTotals(ctx.prisma, item.orderId);

      return { success: true };
    }),

  // Fire order items (send to kitchen)
  fireItems: protectedProcedure
    .input(fireOrderItemsSchema)
    .mutation(async ({ ctx, input }) => {
      const now = new Date();

      await ctx.prisma.orderItem.updateMany({
        where: {
          id: { in: input.orderItemIds },
          status: { in: ["PENDING", "HELD"] },
        },
        data: {
          status: "FIRED",
          sentAt: now,
          firedAt: now,
        },
      });

      // Get updated items
      const items = await ctx.prisma.orderItem.findMany({
        where: { id: { in: input.orderItemIds } },
        include: {
          menuItem: { include: { station: true } },
          modifiers: true,
        },
      });

      // Update order status to SENT if not already
      if (items.length > 0) {
        await ctx.prisma.order.update({
          where: { id: items[0].orderId },
          data: { status: "SENT" },
        });
      }

      // Emit real-time event for kitchen
      if (items.length > 0) {
        const order = await ctx.prisma.order.findUnique({
          where: { id: items[0].orderId },
          select: { locationId: true },
        });
        if (order) {
          await broadcastOrderFired(order.locationId, items[0].orderId, ctx.user.id);
        }
      }

      return items;
    }),

  // Fire entire order or specific course
  fireOrder: protectedProcedure
    .input(fireOrderSchema)
    .mutation(async ({ ctx, input }) => {
      const now = new Date();

      const whereClause: Prisma.OrderItemWhereInput = {
        orderId: input.orderId,
        status: { in: ["PENDING", "HELD"] },
      };

      if (input.course) {
        whereClause.course = input.course;
      }

      await ctx.prisma.orderItem.updateMany({
        where: whereClause,
        data: {
          status: "FIRED",
          sentAt: now,
          firedAt: now,
        },
      });

      const order = await ctx.prisma.order.update({
        where: { id: input.orderId },
        data: { status: "SENT" },
      });

      // Emit real-time event
      await broadcastOrderFired(order.locationId, input.orderId, ctx.user.id);

      return { success: true };
    }),

  // Hold order items
  holdItems: protectedProcedure
    .input(holdOrderItemsSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.orderItem.updateMany({
        where: {
          id: { in: input.orderItemIds },
          status: "PENDING",
        },
        data: {
          status: "HELD",
        },
      });

      return { success: true };
    }),

  // Mark item as ready (bump from kitchen)
  bumpItem: protectedProcedure
    .input(bumpOrderItemSchema)
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.prisma.orderItem.update({
        where: { id: input.orderItemId },
        data: {
          status: "READY",
          readyAt: new Date(),
        },
        include: {
          order: true,
        },
      });

      // Check if all items are ready
      const orderItems = await ctx.prisma.orderItem.findMany({
        where: { orderId: item.orderId },
      });

      const allReady = orderItems.every(
        (i) => i.status === "READY" || i.status === "SERVED" || i.status === "VOID"
      );

      if (allReady) {
        await ctx.prisma.order.update({
          where: { id: item.orderId },
          data: { status: "READY" },
        });
      }

      // Emit real-time event
      await broadcast("TICKET_BUMPED", item.order.locationId, {
        orderId: item.orderId,
        orderItemId: input.orderItemId,
      }, ctx.user.id);

      return item;
    }),

  // Mark item as served
  serveItem: protectedProcedure
    .input(serveOrderItemSchema)
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.prisma.orderItem.update({
        where: { id: input.orderItemId },
        data: {
          status: "SERVED",
          servedAt: new Date(),
        },
      });

      // Check if all items are served
      const orderItems = await ctx.prisma.orderItem.findMany({
        where: { orderId: item.orderId },
      });

      const allServed = orderItems.every(
        (i) => i.status === "SERVED" || i.status === "VOID"
      );

      if (allServed) {
        await ctx.prisma.order.update({
          where: { id: item.orderId },
          data: { status: "SERVED" },
        });
      }

      return item;
    }),

  // Void an item
  voidItem: orderVoidProcedure
    .input(voidOrderItemSchema)
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.prisma.orderItem.findUnique({
        where: { id: input.orderItemId },
      });

      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
      }

      // Create void record
      await ctx.prisma.void.create({
        data: {
          orderId: item.orderId,
          orderItemId: input.orderItemId,
          reason: input.reason,
          amount: item.totalPrice,
          approvedById: input.approvedById,
        },
      });

      // Update item status
      await ctx.prisma.orderItem.update({
        where: { id: input.orderItemId },
        data: { status: "VOID" },
      });

      // Update order totals
      await updateOrderTotals(ctx.prisma, item.orderId);

      return { success: true };
    }),

  // Add comp
  addComp: orderCompProcedure.input(addCompSchema).mutation(async ({ ctx, input }) => {
    await ctx.prisma.comp.create({
      data: {
        orderId: input.orderId,
        reason: input.reason,
        amount: input.amount,
        approvedById: input.approvedById,
      },
    });

    await updateOrderTotals(ctx.prisma, input.orderId);

    return { success: true };
  }),

  // Add discount
  addDiscount: orderDiscountProcedure
    .input(addDiscountSchema)
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.prisma.order.findUnique({
        where: { id: input.orderId },
      });

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      // Calculate discount amount
      let discountAmount: number;
      if (input.type === DiscountType.PERCENTAGE) {
        discountAmount = Number(order.subtotal) * (input.value / 100);
      } else {
        discountAmount = input.value;
      }

      await ctx.prisma.discount.create({
        data: {
          orderId: input.orderId,
          name: input.name,
          type: input.type,
          value: input.value,
          amount: discountAmount,
          approvedById: input.approvedById,
        },
      });

      await updateOrderTotals(ctx.prisma, input.orderId);

      return { success: true };
    }),

  // Add payment
  addPayment: protectedProcedure
    .input(addPaymentSchema)
    .mutation(async ({ ctx, input }) => {
      const payment = await ctx.prisma.payment.create({
        data: input,
      });

      // Update check if specified
      if (input.checkId) {
        const check = await ctx.prisma.check.findUnique({
          where: { id: input.checkId },
          include: { payments: true },
        });

        if (check) {
          const totalPaid = check.payments.reduce(
            (sum, p) => sum + Number(p.amount) + Number(p.tipAmount),
            0
          );
          if (totalPaid >= Number(check.total)) {
            await ctx.prisma.check.update({
              where: { id: input.checkId },
              data: { isPaid: true },
            });
          }
        }
      }

      // Update order totals
      await updateOrderTotals(ctx.prisma, input.orderId);

      return payment;
    }),

  // Split check by items
  splitCheck: protectedProcedure
    .input(splitCheckSchema)
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.prisma.order.findUnique({
        where: { id: input.orderId },
        include: { items: true },
      });

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      // Create checks for each split
      const checks = await Promise.all(
        input.splits.map(async (split, index) => {
          // Calculate split totals
          const items = order.items.filter((i) =>
            split.orderItemIds.includes(i.id)
          );
          const subtotal = items
            .filter((i) => i.status !== "VOID")
            .reduce((sum, i) => sum + Number(i.totalPrice), 0);

          const taxRate = 0.0825; // TODO: Get from settings
          const taxAmount = subtotal * taxRate;
          const total = subtotal + taxAmount;

          const check = await ctx.prisma.check.create({
            data: {
              orderId: input.orderId,
              name: split.name || `Check ${index + 1}`,
              subtotal,
              taxAmount,
              total,
            },
          });

          // Assign items to check
          await ctx.prisma.orderItem.updateMany({
            where: { id: { in: split.orderItemIds } },
            data: { checkId: check.id },
          });

          return check;
        })
      );

      return checks;
    }),

  // Split check by seat
  splitCheckBySeat: protectedProcedure
    .input(splitCheckBySeatSchema)
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.prisma.order.findUnique({
        where: { id: input.orderId },
        include: { items: true },
      });

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      // Group items by seat
      const itemsBySeat = order.items.reduce(
        (acc, item) => {
          const seat = item.seat;
          if (!acc[seat]) acc[seat] = [];
          acc[seat].push(item);
          return acc;
        },
        {} as Record<number, typeof order.items>
      );

      // Create a check for each seat
      const checks = await Promise.all(
        Object.entries(itemsBySeat).map(async ([seat, items]) => {
          const subtotal = items
            .filter((i) => i.status !== "VOID")
            .reduce((sum, i) => sum + Number(i.totalPrice), 0);

          const taxRate = 0.0825;
          const taxAmount = subtotal * taxRate;
          const total = subtotal + taxAmount;

          const check = await ctx.prisma.check.create({
            data: {
              orderId: input.orderId,
              name: `Seat ${seat}`,
              subtotal,
              taxAmount,
              total,
            },
          });

          await ctx.prisma.orderItem.updateMany({
            where: { id: { in: items.map((i) => i.id) } },
            data: { checkId: check.id },
          });

          return check;
        })
      );

      return checks;
    }),

  // Close order
  closeOrder: protectedProcedure
    .input(closeOrderSchema)
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.prisma.order.findUnique({
        where: { id: input.orderId },
        include: {
          payments: true,
          checks: { include: { payments: true } },
        },
      });

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      // Calculate total paid
      const totalPaid = order.payments.reduce(
        (sum, p) => sum + Number(p.amount) + Number(p.tipAmount),
        0
      );

      if (totalPaid < Number(order.total)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Order not fully paid",
        });
      }

      await ctx.prisma.order.update({
        where: { id: input.orderId },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
        },
      });

      return { success: true };
    }),

  // Transfer table
  transferTable: protectedProcedure
    .input(transferTableSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.order.update({
        where: { id: input.orderId },
        data: { tableId: input.newTableId },
      });

      return { success: true };
    }),

  // Get tables for location
  getTables: protectedProcedure
    .input(z.object({ locationId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const tables = await ctx.prisma.table.findMany({
        where: { locationId: input.locationId, isActive: true },
        include: {
          orders: {
            where: {
              status: { in: ["OPEN", "SENT", "IN_PROGRESS", "READY", "SERVED"] },
            },
            include: {
              server: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: [{ section: "asc" }, { name: "asc" }],
      });

      return tables;
    }),
});

// Helper to update order totals
async function updateOrderTotals(
  prisma: typeof import("@mise-pos/database").prisma,
  orderId: string
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      discounts: true,
      comps: true,
      payments: true,
    },
  });

  if (!order) return;

  // Calculate subtotal (non-voided items)
  const subtotal = order.items
    .filter((i) => i.status !== "VOID")
    .reduce((sum, i) => sum + Number(i.totalPrice), 0);

  // Calculate discounts
  const discountAmount = order.discounts.reduce(
    (sum, d) => sum + Number(d.amount),
    0
  );

  // Calculate comps
  const compAmount = order.comps.reduce((sum, c) => sum + Number(c.amount), 0);

  // Calculate tax (after discounts and comps)
  const taxableAmount = Math.max(0, subtotal - discountAmount - compAmount);
  const taxRate = 0.0825; // TODO: Get from settings
  const taxAmount = taxableAmount * taxRate;

  // Calculate tips
  const tipAmount = order.payments.reduce(
    (sum, p) => sum + Number(p.tipAmount),
    0
  );

  // Calculate total
  const total = taxableAmount + taxAmount;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      subtotal,
      discountAmount,
      taxAmount,
      tipAmount,
      total,
    },
  });
}
