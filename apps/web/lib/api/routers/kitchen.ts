import { z } from "zod";
import { router, protectedProcedure, createPermissionProcedure } from "../trpc-server";
import { bumpTicketSchema } from "@mise-pos/types";
import { PERMISSIONS } from "@mise-pos/types";

const kitchenViewProcedure = createPermissionProcedure(PERMISSIONS.KITCHEN_VIEW);
const kitchenBumpProcedure = createPermissionProcedure(PERMISSIONS.KITCHEN_BUMP);
const kitchenRecallProcedure = createPermissionProcedure(PERMISSIONS.KITCHEN_RECALL);

export const kitchenRouter = router({
  // Get tickets for KDS (grouped by order)
  getTickets: kitchenViewProcedure
    .input(
      z.object({
        locationId: z.string().cuid(),
        stationId: z.string().cuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get orders with items that are fired but not ready/served
      const orders = await ctx.prisma.order.findMany({
        where: {
          locationId: input.locationId,
          status: { in: ["SENT", "IN_PROGRESS"] },
          items: {
            some: {
              status: { in: ["FIRED", "IN_PROGRESS"] },
              ...(input.stationId
                ? { menuItem: { stationId: input.stationId } }
                : {}),
            },
          },
        },
        include: {
          table: true,
          server: {
            select: { firstName: true, lastName: true },
          },
          items: {
            where: {
              status: { in: ["FIRED", "IN_PROGRESS", "READY"] },
              ...(input.stationId
                ? { menuItem: { stationId: input.stationId } }
                : {}),
            },
            include: {
              menuItem: {
                include: { station: true },
              },
              modifiers: true,
            },
            orderBy: [{ course: "asc" }, { seat: "asc" }, { firedAt: "asc" }],
          },
        },
        orderBy: { openedAt: "asc" },
      });

      // Transform into ticket format
      const tickets = orders.map((order) => {
        const firstFiredAt = order.items
          .filter((i) => i.firedAt)
          .sort((a, b) => a.firedAt!.getTime() - b.firedAt!.getTime())[0]?.firedAt;

        const ageMinutes = firstFiredAt
          ? Math.floor((Date.now() - firstFiredAt.getTime()) / 60000)
          : 0;

        // Determine ticket status based on age
        let ticketStatus: "new" | "cooking" | "ready" | "late" = "new";
        if (ageMinutes > 15) {
          ticketStatus = "late";
        } else if (ageMinutes > 10) {
          ticketStatus = "cooking";
        } else if (order.items.every((i) => i.status === "READY")) {
          ticketStatus = "ready";
        }

        return {
          orderId: order.id,
          orderNumber: order.orderNumber,
          tableName: order.table?.name || order.tabName || `Order ${order.orderNumber}`,
          serverName: `${order.server.firstName} ${order.server.lastName.charAt(0)}.`,
          guestCount: order.guestCount,
          firedAt: firstFiredAt,
          ageMinutes,
          ticketStatus,
          items: order.items.map((item) => ({
            id: item.id,
            name: item.menuItem.name,
            kitchenName: item.menuItem.kitchenName || item.menuItem.name,
            quantity: item.quantity,
            seat: item.seat,
            course: item.course,
            status: item.status,
            station: item.menuItem.station,
            modifiers: item.modifiers.map((m) => m.name),
            specialInstructions: item.specialInstructions,
          })),
        };
      });

      return tickets;
    }),

  // Get expo view (all stations combined, items ready for pickup)
  getExpoView: kitchenViewProcedure
    .input(z.object({ locationId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const orders = await ctx.prisma.order.findMany({
        where: {
          locationId: input.locationId,
          status: { in: ["SENT", "IN_PROGRESS", "READY"] },
          items: {
            some: {
              status: { in: ["FIRED", "IN_PROGRESS", "READY"] },
            },
          },
        },
        include: {
          table: true,
          server: {
            select: { firstName: true, lastName: true },
          },
          items: {
            where: {
              status: { in: ["FIRED", "IN_PROGRESS", "READY"] },
            },
            include: {
              menuItem: {
                include: { station: true },
              },
              modifiers: true,
            },
            orderBy: [{ course: "asc" }, { seat: "asc" }],
          },
        },
        orderBy: { openedAt: "asc" },
      });

      return orders.map((order) => ({
        orderId: order.id,
        orderNumber: order.orderNumber,
        tableName: order.table?.name || order.tabName || `Order ${order.orderNumber}`,
        serverName: `${order.server.firstName} ${order.server.lastName.charAt(0)}.`,
        items: order.items,
        allReady: order.items.every((i) => i.status === "READY"),
      }));
    }),

  // Bump entire ticket (all items for an order at a station)
  bumpTicket: kitchenBumpProcedure
    .input(bumpTicketSchema)
    .mutation(async ({ ctx, input }) => {
      const now = new Date();

      const whereClause: Parameters<typeof ctx.prisma.orderItem.updateMany>[0]["where"] = {
        orderId: input.orderId,
        status: { in: ["FIRED", "IN_PROGRESS"] },
      };

      if (input.stationId) {
        whereClause.menuItem = { stationId: input.stationId };
      }

      await ctx.prisma.orderItem.updateMany({
        where: whereClause,
        data: {
          status: "READY",
          readyAt: now,
        },
      });

      // Check if all items are now ready
      const remainingItems = await ctx.prisma.orderItem.count({
        where: {
          orderId: input.orderId,
          status: { in: ["FIRED", "IN_PROGRESS"] },
        },
      });

      if (remainingItems === 0) {
        await ctx.prisma.order.update({
          where: { id: input.orderId },
          data: { status: "READY" },
        });
      }

      // TODO: Emit real-time event

      return { success: true };
    }),

  // Recall ticket (move back to in-progress)
  recallTicket: kitchenRecallProcedure
    .input(z.object({ orderId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.orderItem.updateMany({
        where: {
          orderId: input.orderId,
          status: "READY",
        },
        data: {
          status: "IN_PROGRESS",
          readyAt: null,
        },
      });

      await ctx.prisma.order.update({
        where: { id: input.orderId },
        data: { status: "IN_PROGRESS" },
      });

      // TODO: Emit real-time event

      return { success: true };
    }),

  // Mark single item as in-progress (started working on it)
  startItem: kitchenBumpProcedure
    .input(z.object({ orderItemId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.orderItem.update({
        where: { id: input.orderItemId },
        data: { status: "IN_PROGRESS" },
      });

      return { success: true };
    }),

  // Get station summary (count of pending items per station)
  getStationSummary: kitchenViewProcedure
    .input(z.object({ locationId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const stations = await ctx.prisma.station.findMany({
        where: { locationId: input.locationId },
        orderBy: { sortOrder: "asc" },
      });

      const stationCounts = await Promise.all(
        stations.map(async (station) => {
          const count = await ctx.prisma.orderItem.count({
            where: {
              menuItem: { stationId: station.id },
              status: { in: ["FIRED", "IN_PROGRESS"] },
              order: { locationId: input.locationId },
            },
          });

          return {
            station,
            pendingCount: count,
          };
        })
      );

      return stationCounts;
    }),

  // Get ticket timing statistics
  getTimingStats: kitchenViewProcedure
    .input(z.object({ locationId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Get recently completed items
      const completedItems = await ctx.prisma.orderItem.findMany({
        where: {
          order: { locationId: input.locationId },
          status: { in: ["READY", "SERVED"] },
          readyAt: { gte: oneHourAgo },
          firedAt: { not: null },
        },
        select: {
          firedAt: true,
          readyAt: true,
          menuItem: {
            select: { stationId: true },
          },
        },
      });

      // Calculate average ticket time
      const ticketTimes = completedItems
        .filter((i) => i.firedAt && i.readyAt)
        .map((i) => (i.readyAt!.getTime() - i.firedAt!.getTime()) / 60000);

      const avgTicketTime =
        ticketTimes.length > 0
          ? ticketTimes.reduce((a, b) => a + b, 0) / ticketTimes.length
          : 0;

      // Get count of current tickets
      const activeTickets = await ctx.prisma.order.count({
        where: {
          locationId: input.locationId,
          status: { in: ["SENT", "IN_PROGRESS"] },
        },
      });

      // Get count of late tickets (>15 min)
      const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000);
      const lateTickets = await ctx.prisma.order.count({
        where: {
          locationId: input.locationId,
          status: { in: ["SENT", "IN_PROGRESS"] },
          items: {
            some: {
              firedAt: { lt: fifteenMinAgo },
              status: { in: ["FIRED", "IN_PROGRESS"] },
            },
          },
        },
      });

      return {
        avgTicketTime: Math.round(avgTicketTime * 10) / 10,
        activeTickets,
        lateTickets,
        completedLastHour: completedItems.length,
      };
    }),
});
