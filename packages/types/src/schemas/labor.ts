import { z } from "zod";
import { ShiftStatus, BreakType, PrepPriority, PrepStatus, AnnouncementPriority } from "../enums";

// Shift schemas
export const createShiftSchema = z.object({
  locationId: z.string().cuid(),
  userId: z.string().cuid(),
  role: z.string().min(1, "Role is required"),
  scheduledStart: z.string().datetime(),
  scheduledEnd: z.string().datetime(),
  notes: z.string().optional(),
});
export type CreateShiftInput = z.infer<typeof createShiftSchema>;

export const updateShiftSchema = z.object({
  id: z.string().cuid(),
  userId: z.string().cuid().optional(),
  role: z.string().optional(),
  scheduledStart: z.string().datetime().optional(),
  scheduledEnd: z.string().datetime().optional(),
  status: z.nativeEnum(ShiftStatus).optional(),
  notes: z.string().optional().nullable(),
});
export type UpdateShiftInput = z.infer<typeof updateShiftSchema>;

export const bulkCreateShiftsSchema = z.object({
  shifts: z.array(createShiftSchema),
});
export type BulkCreateShiftsInput = z.infer<typeof bulkCreateShiftsSchema>;

// Clock in/out schemas
export const clockInSchema = z.object({
  shiftId: z.string().cuid(),
});
export type ClockInInput = z.infer<typeof clockInSchema>;

export const clockOutSchema = z.object({
  shiftId: z.string().cuid(),
});
export type ClockOutInput = z.infer<typeof clockOutSchema>;

// Break schemas
export const startBreakSchema = z.object({
  shiftId: z.string().cuid(),
  type: z.nativeEnum(BreakType),
});
export type StartBreakInput = z.infer<typeof startBreakSchema>;

export const endBreakSchema = z.object({
  breakId: z.string().cuid(),
});
export type EndBreakInput = z.infer<typeof endBreakSchema>;

// Shift swap schemas
export const requestShiftSwapSchema = z.object({
  shiftId: z.string().cuid(),
  requestedUserId: z.string().cuid().optional(), // Who to swap with, or null for open
  reason: z.string().optional(),
});
export type RequestShiftSwapInput = z.infer<typeof requestShiftSwapSchema>;

export const respondToShiftSwapSchema = z.object({
  swapRequestId: z.string().cuid(),
  approved: z.boolean(),
  respondingUserId: z.string().cuid().optional(), // If someone is picking up an open shift
});
export type RespondToShiftSwapInput = z.infer<typeof respondToShiftSwapSchema>;

// Table schemas
export const createTableSchema = z.object({
  locationId: z.string().cuid(),
  name: z.string().min(1, "Table name is required"),
  section: z.string().optional(),
  capacity: z.number().int().positive().default(4),
  posX: z.number().int().optional(),
  posY: z.number().int().optional(),
});
export type CreateTableInput = z.infer<typeof createTableSchema>;

export const updateTableSchema = createTableSchema.partial().extend({
  id: z.string().cuid(),
  isActive: z.boolean().optional(),
});
export type UpdateTableInput = z.infer<typeof updateTableSchema>;

// Station schemas
export const createStationSchema = z.object({
  locationId: z.string().cuid(),
  name: z.string().min(1, "Station name is required"),
  shortName: z.string().min(1, "Short name is required"),
  color: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isExpo: z.boolean().default(false),
});
export type CreateStationInput = z.infer<typeof createStationSchema>;

export const updateStationSchema = createStationSchema.partial().extend({
  id: z.string().cuid(),
});
export type UpdateStationInput = z.infer<typeof updateStationSchema>;

// Prep Task schemas
export const createPrepTaskSchema = z.object({
  locationId: z.string().cuid(),
  name: z.string().min(1, "Task name is required"),
  description: z.string().optional(),
  quantity: z.number().positive().optional(),
  unit: z.string().optional(),
  priority: z.nativeEnum(PrepPriority).default("NORMAL"),
  dueAt: z.string().datetime().optional(),
  assignedToId: z.string().cuid().optional(),
});
export type CreatePrepTaskInput = z.infer<typeof createPrepTaskSchema>;

export const updatePrepTaskSchema = z.object({
  id: z.string().cuid(),
  name: z.string().optional(),
  description: z.string().optional().nullable(),
  quantity: z.number().positive().optional().nullable(),
  unit: z.string().optional().nullable(),
  priority: z.nativeEnum(PrepPriority).optional(),
  status: z.nativeEnum(PrepStatus).optional(),
  dueAt: z.string().datetime().optional().nullable(),
  assignedToId: z.string().cuid().optional().nullable(),
});
export type UpdatePrepTaskInput = z.infer<typeof updatePrepTaskSchema>;

export const completePrepTaskSchema = z.object({
  id: z.string().cuid(),
});
export type CompletePrepTaskInput = z.infer<typeof completePrepTaskSchema>;

// Announcement schemas
export const createAnnouncementSchema = z.object({
  locationId: z.string().cuid(),
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  priority: z.nativeEnum(AnnouncementPriority).default("NORMAL"),
  expiresAt: z.string().datetime().optional(),
});
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;

export const updateAnnouncementSchema = z.object({
  id: z.string().cuid(),
  title: z.string().optional(),
  content: z.string().optional(),
  priority: z.nativeEnum(AnnouncementPriority).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
});
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;

// Schedule query schemas
export const getScheduleSchema = z.object({
  locationId: z.string().cuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  userId: z.string().cuid().optional(),
  role: z.string().optional(),
});
export type GetScheduleInput = z.infer<typeof getScheduleSchema>;
