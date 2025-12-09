import { z } from "zod";
import { router, protectedProcedure, createPermissionProcedure } from "../trpc-server";
import { TRPCError } from "@trpc/server";
import {
  createShiftSchema,
  updateShiftSchema,
  bulkCreateShiftsSchema,
  clockInSchema,
  clockOutSchema,
  startBreakSchema,
  endBreakSchema,
  createTableSchema,
  updateTableSchema,
  createStationSchema,
  updateStationSchema,
  createPrepTaskSchema,
  updatePrepTaskSchema,
  createAnnouncementSchema,
  updateAnnouncementSchema,
  getScheduleSchema,
} from "@mise-pos/types";
import { PERMISSIONS } from "@mise-pos/types";

const laborViewOwnProcedure = createPermissionProcedure(PERMISSIONS.LABOR_VIEW_OWN);
const laborViewAllProcedure = createPermissionProcedure(PERMISSIONS.LABOR_VIEW_ALL);
const laborScheduleProcedure = createPermissionProcedure(PERMISSIONS.LABOR_SCHEDULE);

export const laborRouter = router({
  // Get schedule
  getSchedule: laborViewOwnProcedure
    .input(getScheduleSchema)
    .query(async ({ ctx, input }) => {
      const whereClause: {
        locationId: string;
        scheduledStart: { gte: Date };
        scheduledEnd: { lte: Date };
        userId?: string;
        role?: string;
      } = {
        locationId: input.locationId,
        scheduledStart: { gte: new Date(input.startDate) },
        scheduledEnd: { lte: new Date(input.endDate) },
      };

      // Non-managers can only see their own shifts
      const userPermissions = ctx.user.permissions as Record<string, boolean>;
      if (!userPermissions[PERMISSIONS.LABOR_VIEW_ALL]) {
        whereClause.userId = ctx.user.id;
      } else if (input.userId) {
        whereClause.userId = input.userId;
      }

      if (input.role) {
        whereClause.role = input.role;
      }

      return ctx.prisma.shift.findMany({
        where: whereClause,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
          breaks: true,
        },
        orderBy: [{ scheduledStart: "asc" }, { role: "asc" }],
      });
    }),

  // Get today's shifts for a location
  getTodayShifts: laborViewAllProcedure
    .input(z.object({ locationId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      return ctx.prisma.shift.findMany({
        where: {
          locationId: input.locationId,
          scheduledStart: { gte: today, lt: tomorrow },
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
          breaks: true,
        },
        orderBy: [{ scheduledStart: "asc" }, { role: "asc" }],
      });
    }),

  // Create shift
  createShift: laborScheduleProcedure
    .input(createShiftSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.shift.create({
        data: {
          ...input,
          scheduledStart: new Date(input.scheduledStart),
          scheduledEnd: new Date(input.scheduledEnd),
        },
      });
    }),

  // Update shift
  updateShift: laborScheduleProcedure
    .input(updateShiftSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.shift.update({
        where: { id },
        data: {
          ...data,
          scheduledStart: data.scheduledStart
            ? new Date(data.scheduledStart)
            : undefined,
          scheduledEnd: data.scheduledEnd
            ? new Date(data.scheduledEnd)
            : undefined,
        },
      });
    }),

  // Bulk create shifts
  bulkCreateShifts: laborScheduleProcedure
    .input(bulkCreateShiftsSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.shift.createMany({
        data: input.shifts.map((shift) => ({
          ...shift,
          scheduledStart: new Date(shift.scheduledStart),
          scheduledEnd: new Date(shift.scheduledEnd),
        })),
      });
    }),

  // Delete shift
  deleteShift: laborScheduleProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.shift.delete({
        where: { id: input.id },
      });
    }),

  // Clock in
  clockIn: laborViewOwnProcedure
    .input(clockInSchema)
    .mutation(async ({ ctx, input }) => {
      const shift = await ctx.prisma.shift.findUnique({
        where: { id: input.shiftId },
      });

      if (!shift) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Shift not found" });
      }

      if (shift.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot clock in to someone else's shift",
        });
      }

      if (shift.clockedInAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Already clocked in",
        });
      }

      const now = new Date();

      // Update shift
      await ctx.prisma.shift.update({
        where: { id: input.shiftId },
        data: {
          status: "IN_PROGRESS",
          clockedInAt: now,
          clockedInUserId: ctx.user.id,
        },
      });

      // Create time entry
      await ctx.prisma.timeEntry.create({
        data: {
          shiftId: input.shiftId,
          userId: ctx.user.id,
          type: "CLOCK_IN",
          occurredAt: now,
        },
      });

      return { success: true, clockedInAt: now };
    }),

  // Clock out
  clockOut: laborViewOwnProcedure
    .input(clockOutSchema)
    .mutation(async ({ ctx, input }) => {
      const shift = await ctx.prisma.shift.findUnique({
        where: { id: input.shiftId },
      });

      if (!shift) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Shift not found" });
      }

      if (shift.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot clock out of someone else's shift",
        });
      }

      if (!shift.clockedInAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Not clocked in",
        });
      }

      const now = new Date();

      // Update shift
      await ctx.prisma.shift.update({
        where: { id: input.shiftId },
        data: {
          status: "COMPLETED",
          clockedOutAt: now,
          clockedInUserId: null,
        },
      });

      // Create time entry
      await ctx.prisma.timeEntry.create({
        data: {
          shiftId: input.shiftId,
          userId: ctx.user.id,
          type: "CLOCK_OUT",
          occurredAt: now,
        },
      });

      return { success: true, clockedOutAt: now };
    }),

  // Start break
  startBreak: laborViewOwnProcedure
    .input(startBreakSchema)
    .mutation(async ({ ctx, input }) => {
      const shift = await ctx.prisma.shift.findUnique({
        where: { id: input.shiftId },
      });

      if (!shift || shift.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const now = new Date();

      const breakRecord = await ctx.prisma.break.create({
        data: {
          shiftId: input.shiftId,
          type: input.type,
          startedAt: now,
        },
      });

      await ctx.prisma.timeEntry.create({
        data: {
          shiftId: input.shiftId,
          userId: ctx.user.id,
          type: "BREAK_START",
          occurredAt: now,
        },
      });

      return breakRecord;
    }),

  // End break
  endBreak: laborViewOwnProcedure
    .input(endBreakSchema)
    .mutation(async ({ ctx, input }) => {
      const breakRecord = await ctx.prisma.break.findUnique({
        where: { id: input.breakId },
        include: { shift: true },
      });

      if (!breakRecord || breakRecord.shift.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const now = new Date();
      const duration = Math.round(
        (now.getTime() - breakRecord.startedAt.getTime()) / 60000
      );

      await ctx.prisma.break.update({
        where: { id: input.breakId },
        data: {
          endedAt: now,
          duration,
        },
      });

      await ctx.prisma.timeEntry.create({
        data: {
          shiftId: breakRecord.shiftId,
          userId: ctx.user.id,
          type: "BREAK_END",
          occurredAt: now,
        },
      });

      return { success: true, duration };
    }),

  // Get currently clocked in staff
  getClockedIn: laborViewAllProcedure
    .input(z.object({ locationId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.shift.findMany({
        where: {
          locationId: input.locationId,
          status: "IN_PROGRESS",
          clockedInAt: { not: null },
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
          breaks: {
            where: { endedAt: null },
          },
        },
      });
    }),

  // Tables management
  getTables: protectedProcedure
    .input(z.object({ locationId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.table.findMany({
        where: { locationId: input.locationId, isActive: true },
        orderBy: [{ section: "asc" }, { name: "asc" }],
      });
    }),

  createTable: laborScheduleProcedure
    .input(createTableSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.table.create({ data: input });
    }),

  updateTable: laborScheduleProcedure
    .input(updateTableSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.table.update({ where: { id }, data });
    }),

  // Stations management
  getStations: protectedProcedure
    .input(z.object({ locationId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.station.findMany({
        where: { locationId: input.locationId },
        orderBy: { sortOrder: "asc" },
      });
    }),

  createStation: laborScheduleProcedure
    .input(createStationSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.station.create({ data: input });
    }),

  updateStation: laborScheduleProcedure
    .input(updateStationSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.station.update({ where: { id }, data });
    }),

  // Prep tasks
  getPrepTasks: protectedProcedure
    .input(
      z.object({
        locationId: z.string().cuid(),
        status: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.prepTask.findMany({
        where: {
          locationId: input.locationId,
          ...(input.status ? { status: input.status as never } : {}),
        },
        include: {
          assignedTo: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
      });
    }),

  createPrepTask: protectedProcedure
    .input(createPrepTaskSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.prepTask.create({
        data: {
          ...input,
          dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
        },
      });
    }),

  updatePrepTask: protectedProcedure
    .input(updatePrepTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.prepTask.update({
        where: { id },
        data: {
          ...data,
          dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
          completedAt: data.status === "COMPLETED" ? new Date() : undefined,
        },
      });
    }),

  completePrepTask: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.prepTask.update({
        where: { id: input.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });
    }),

  // Announcements
  getAnnouncements: protectedProcedure
    .input(z.object({ locationId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.announcement.findMany({
        where: {
          locationId: input.locationId,
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        include: {
          createdBy: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      });
    }),

  createAnnouncement: laborScheduleProcedure
    .input(createAnnouncementSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.announcement.create({
        data: {
          ...input,
          createdById: ctx.user.id,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
        },
      });
    }),

  updateAnnouncement: laborScheduleProcedure
    .input(updateAnnouncementSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.announcement.update({
        where: { id },
        data: {
          ...data,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
        },
      });
    }),

  deleteAnnouncement: laborScheduleProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.announcement.update({
        where: { id: input.id },
        data: { isActive: false },
      });
    }),

  // Labor cost summary
  getLaborCostSummary: laborViewAllProcedure
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

      // Get completed shifts for the day
      const shifts = await ctx.prisma.shift.findMany({
        where: {
          locationId: input.locationId,
          status: { in: ["COMPLETED", "IN_PROGRESS"] },
          scheduledStart: { gte: date, lt: endDate },
        },
        include: {
          breaks: true,
        },
      });

      // Calculate hours worked
      let totalHours = 0;
      for (const shift of shifts) {
        const clockIn = shift.clockedInAt || shift.scheduledStart;
        const clockOut = shift.clockedOutAt || new Date();
        const hoursWorked = (clockOut.getTime() - clockIn.getTime()) / 3600000;

        // Subtract unpaid breaks
        const unpaidBreakMinutes = shift.breaks
          .filter((b) => b.type === "UNPAID" && b.duration)
          .reduce((sum, b) => sum + (b.duration || 0), 0);

        totalHours += hoursWorked - unpaidBreakMinutes / 60;
      }

      return {
        totalHours: Math.round(totalHours * 100) / 100,
        shiftCount: shifts.length,
        // Labor cost would require hourly rates which we'd need to add to the schema
      };
    }),
});
