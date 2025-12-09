import { z } from "zod";
import { router, createPermissionProcedure } from "../trpc-server";
import { PERMISSIONS } from "@mise-pos/types";

const reportsViewProcedure = createPermissionProcedure(PERMISSIONS.REPORTS_VIEW);
const reportsSalesProcedure = createPermissionProcedure(PERMISSIONS.REPORTS_SALES);

export const reportsRouter = router({
  // Sales summary
  getSalesSummary: reportsSalesProcedure
    .input(
      z.object({
        locationId: z.string().cuid(),
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const start = new Date(input.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(input.endDate);
      end.setHours(23, 59, 59, 999);

      // Get orders in date range
      const orders = await ctx.prisma.order.findMany({
        where: {
          locationId: input.locationId,
          status: "CLOSED",
          closedAt: { gte: start, lte: end },
        },
        include: {
          items: true,
          payments: true,
          voids: true,
          comps: true,
          discounts: true,
        },
      });

      // Calculate metrics
      const orderCount = orders.length;
      const guestCount = orders.reduce((sum: number, o: typeof orders[number]) => sum + o.guestCount, 0);
      const grossSales = orders.reduce((sum: number, o: typeof orders[number]) => sum + Number(o.subtotal), 0);
      const discounts = orders.reduce(
        (sum: number, o: typeof orders[number]) => sum + Number(o.discountAmount),
        0
      );
      const voidsArray = orders.flatMap((o: typeof orders[number]) => o.voids);
      const voids = voidsArray.reduce((sum: number, v: typeof voidsArray[number]) => sum + Number(v.amount), 0);
      const compsArray = orders.flatMap((o: typeof orders[number]) => o.comps);
      const comps = compsArray.reduce((sum: number, c: typeof compsArray[number]) => sum + Number(c.amount), 0);
      const netSales = grossSales - discounts - comps;
      const taxes = orders.reduce((sum: number, o: typeof orders[number]) => sum + Number(o.taxAmount), 0);
      const tips = orders.reduce((sum: number, o: typeof orders[number]) => sum + Number(o.tipAmount), 0);

      const checkAverage = orderCount > 0 ? netSales / orderCount : 0;
      const ppaAverage = guestCount > 0 ? netSales / guestCount : 0;

      // Payment breakdown
      const paymentsArray = orders.flatMap((o: typeof orders[number]) => o.payments);
      const paymentsByMethod = paymentsArray.reduce(
        (acc: Record<string, number>, p: typeof paymentsArray[number]) => {
          const method = p.method;
          if (!acc[method]) acc[method] = 0;
          acc[method] += Number(p.amount);
          return acc;
        },
        {} as Record<string, number>
      );

      return {
        orderCount,
        guestCount,
        grossSales,
        discounts,
        voids,
        comps,
        netSales,
        taxes,
        tips,
        checkAverage: Math.round(checkAverage * 100) / 100,
        ppaAverage: Math.round(ppaAverage * 100) / 100,
        paymentsByMethod,
      };
    }),

  // Hourly sales breakdown
  getHourlySales: reportsSalesProcedure
    .input(
      z.object({
        locationId: z.string().cuid(),
        date: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const date = new Date(input.date);
      date.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);

      const orders = await ctx.prisma.order.findMany({
        where: {
          locationId: input.locationId,
          status: "CLOSED",
          closedAt: { gte: date, lt: endDate },
        },
        select: {
          closedAt: true,
          subtotal: true,
          guestCount: true,
        },
      });

      // Group by hour
      const hourlyData: Record<
        number,
        { sales: number; orders: number; guests: number }
      > = {};

      for (let i = 0; i < 24; i++) {
        hourlyData[i] = { sales: 0, orders: 0, guests: 0 };
      }

      for (const order of orders) {
        if (order.closedAt) {
          const hour = order.closedAt.getHours();
          hourlyData[hour].sales += Number(order.subtotal);
          hourlyData[hour].orders += 1;
          hourlyData[hour].guests += order.guestCount;
        }
      }

      return Object.entries(hourlyData).map(([hour, data]) => ({
        hour: parseInt(hour),
        ...data,
      }));
    }),

  // Item sales ranking
  getItemSales: reportsSalesProcedure
    .input(
      z.object({
        locationId: z.string().cuid(),
        startDate: z.string(),
        endDate: z.string(),
        limit: z.number().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const start = new Date(input.startDate);
      const end = new Date(input.endDate);
      end.setHours(23, 59, 59, 999);

      const items = await ctx.prisma.orderItem.groupBy({
        by: ["menuItemId"],
        where: {
          order: {
            locationId: input.locationId,
            status: "CLOSED",
            closedAt: { gte: start, lte: end },
          },
          status: { not: "VOID" },
        },
        _sum: {
          quantity: true,
          totalPrice: true,
        },
        _count: true,
        orderBy: {
          _sum: {
            totalPrice: "desc",
          },
        },
        take: input.limit,
      });

      // Get menu item details
      const menuItems = await ctx.prisma.menuItem.findMany({
        where: { id: { in: items.map((i) => i.menuItemId) } },
        select: { id: true, name: true, price: true, cost: true },
      });

      const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

      return items.map((item) => {
        const menuItem = menuItemMap.get(item.menuItemId);
        return {
          menuItemId: item.menuItemId,
          name: menuItem?.name || "Unknown",
          quantitySold: item._sum.quantity || 0,
          revenue: Number(item._sum.totalPrice) || 0,
          orderCount: item._count,
          price: menuItem?.price ? Number(menuItem.price) : 0,
          cost: menuItem?.cost ? Number(menuItem.cost) : null,
        };
      });
    }),

  // Category sales breakdown
  getCategorySales: reportsSalesProcedure
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

      // Get order items with category info
      const orderItems = await ctx.prisma.orderItem.findMany({
        where: {
          order: {
            locationId: input.locationId,
            status: "CLOSED",
            closedAt: { gte: start, lte: end },
          },
          status: { not: "VOID" },
        },
        include: {
          menuItem: {
            include: {
              category: true,
            },
          },
        },
      });

      // Group by category
      const categoryData = orderItems.reduce(
        (acc, item) => {
          const categoryName = item.menuItem.category.name;
          if (!acc[categoryName]) {
            acc[categoryName] = { revenue: 0, quantity: 0, itemCount: 0 };
          }
          acc[categoryName].revenue += Number(item.totalPrice);
          acc[categoryName].quantity += item.quantity;
          acc[categoryName].itemCount += 1;
          return acc;
        },
        {} as Record<string, { revenue: number; quantity: number; itemCount: number }>
      );

      const totalRevenue = Object.values(categoryData).reduce(
        (sum, c) => sum + c.revenue,
        0
      );

      return Object.entries(categoryData)
        .map(([name, data]) => ({
          name,
          ...data,
          percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue);
    }),

  // Server performance
  getServerPerformance: reportsSalesProcedure
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

      const orders = await ctx.prisma.order.findMany({
        where: {
          locationId: input.locationId,
          status: "CLOSED",
          closedAt: { gte: start, lte: end },
        },
        include: {
          server: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      // Group by server
      const serverData = orders.reduce(
        (acc, order) => {
          const serverId = order.server.id;
          if (!acc[serverId]) {
            acc[serverId] = {
              name: `${order.server.firstName} ${order.server.lastName}`,
              orderCount: 0,
              guestCount: 0,
              sales: 0,
              tips: 0,
            };
          }
          acc[serverId].orderCount += 1;
          acc[serverId].guestCount += order.guestCount;
          acc[serverId].sales += Number(order.subtotal);
          acc[serverId].tips += Number(order.tipAmount);
          return acc;
        },
        {} as Record<
          string,
          {
            name: string;
            orderCount: number;
            guestCount: number;
            sales: number;
            tips: number;
          }
        >
      );

      return Object.entries(serverData)
        .map(([serverId, data]) => ({
          serverId,
          ...data,
          checkAverage:
            data.orderCount > 0
              ? Math.round((data.sales / data.orderCount) * 100) / 100
              : 0,
          tipPercentage:
            data.sales > 0
              ? Math.round((data.tips / data.sales) * 10000) / 100
              : 0,
        }))
        .sort((a, b) => b.sales - a.sales);
    }),

  // Void/Comp report
  getVoidsAndComps: reportsSalesProcedure
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

      const [voids, comps] = await Promise.all([
        ctx.prisma.void.findMany({
          where: {
            order: { locationId: input.locationId },
            createdAt: { gte: start, lte: end },
          },
          include: {
            order: { select: { orderNumber: true } },
            orderItem: {
              include: { menuItem: { select: { name: true } } },
            },
            approvedBy: {
              select: { firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        ctx.prisma.comp.findMany({
          where: {
            order: { locationId: input.locationId },
            createdAt: { gte: start, lte: end },
          },
          include: {
            order: { select: { orderNumber: true } },
            approvedBy: {
              select: { firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);

      const totalVoids = voids.reduce((sum: number, v: typeof voids[number]) => sum + Number(v.amount), 0);
      const totalComps = comps.reduce((sum: number, c: typeof comps[number]) => sum + Number(c.amount), 0);

      return {
        voids: voids.map((v: typeof voids[number]) => ({
          ...v,
          amount: Number(v.amount),
          itemName: v.orderItem?.menuItem.name,
        })),
        comps: comps.map((c: typeof comps[number]) => ({
          ...c,
          amount: Number(c.amount),
        })),
        totalVoids,
        totalComps,
        total: totalVoids + totalComps,
      };
    }),

  // Dashboard KPIs
  getDashboardKPIs: reportsViewProcedure
    .input(z.object({ locationId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);

      // Today's metrics
      const todayOrders = await ctx.prisma.order.findMany({
        where: {
          locationId: input.locationId,
          status: "CLOSED",
          closedAt: { gte: today },
        },
      });

      const todaySales = todayOrders.reduce(
        (sum: number, o: typeof todayOrders[number]) => sum + Number(o.subtotal),
        0
      );
      const todayGuests = todayOrders.reduce((sum: number, o: typeof todayOrders[number]) => sum + o.guestCount, 0);

      // Yesterday's metrics for comparison
      const yesterdayOrders = await ctx.prisma.order.findMany({
        where: {
          locationId: input.locationId,
          status: "CLOSED",
          closedAt: { gte: yesterday, lt: today },
        },
      });

      const yesterdaySales = yesterdayOrders.reduce(
        (sum, o) => sum + Number(o.subtotal),
        0
      );

      // Last week same day
      const lastWeekOrders = await ctx.prisma.order.findMany({
        where: {
          locationId: input.locationId,
          status: "CLOSED",
          closedAt: {
            gte: lastWeek,
            lt: new Date(lastWeek.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      });

      const lastWeekSales = lastWeekOrders.reduce(
        (sum, o) => sum + Number(o.subtotal),
        0
      );

      // Current active orders
      const activeOrders = await ctx.prisma.order.count({
        where: {
          locationId: input.locationId,
          status: { in: ["OPEN", "SENT", "IN_PROGRESS", "READY", "SERVED"] },
        },
      });

      // Current covers (guests in active orders)
      const activeOrdersData = await ctx.prisma.order.findMany({
        where: {
          locationId: input.locationId,
          status: { in: ["OPEN", "SENT", "IN_PROGRESS", "READY", "SERVED"] },
        },
        select: { guestCount: true },
      });
      const currentCovers = activeOrdersData.reduce(
        (sum, o) => sum + o.guestCount,
        0
      );

      return {
        todaySales,
        todayOrders: todayOrders.length,
        todayGuests,
        todayCheckAverage:
          todayOrders.length > 0
            ? Math.round((todaySales / todayOrders.length) * 100) / 100
            : 0,
        yesterdaySales,
        lastWeekSales,
        salesVsYesterday:
          yesterdaySales > 0
            ? Math.round(((todaySales - yesterdaySales) / yesterdaySales) * 100)
            : 0,
        salesVsLastWeek:
          lastWeekSales > 0
            ? Math.round(((todaySales - lastWeekSales) / lastWeekSales) * 100)
            : 0,
        activeOrders,
        currentCovers,
      };
    }),
});
