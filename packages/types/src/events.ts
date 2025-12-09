import { z } from "zod";
import { OrderStatus, OrderItemStatus, FreshnessStatus, PrepStatus, PrepPriority } from "./enums";

// Event names
export const REALTIME_EVENTS = {
  // Order events
  ORDER_CREATED: "order:created",
  ORDER_UPDATED: "order:updated",
  ORDER_CLOSED: "order:closed",

  // Order item events
  ITEM_ADDED: "item:added",
  ITEM_UPDATED: "item:updated",
  ITEM_FIRED: "item:fired",
  ITEM_READY: "item:ready",
  ITEM_SERVED: "item:served",
  ITEM_VOIDED: "item:voided",

  // Kitchen events
  TICKET_CREATED: "ticket:created",
  TICKET_BUMPED: "ticket:bumped",
  TICKET_RECALLED: "ticket:recalled",

  // 86 events
  ITEM_EIGHTY_SIXED: "eightysix:added",
  ITEM_AVAILABLE: "eightysix:removed",

  // Inventory events
  INVENTORY_LOW: "inventory:low",
  INVENTORY_OUT: "inventory:out",
  INVENTORY_UPDATED: "inventory:updated",
  FRESHNESS_ALERT: "freshness:alert",

  // Labor events
  SHIFT_STARTED: "shift:started",
  SHIFT_ENDED: "shift:ended",
  BREAK_STARTED: "break:started",
  BREAK_ENDED: "break:ended",

  // Operations
  ANNOUNCEMENT: "announcement:new",
  PREP_TASK_CREATED: "prep:created",
  PREP_TASK_COMPLETED: "prep:completed",

  // Table events
  TABLE_SEATED: "table:seated",
  TABLE_CLEARED: "table:cleared",
} as const;

export type RealtimeEvent = (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];

// Channel helpers
export function getLocationChannel(locationId: string, domain: string): string {
  return `location:${locationId}:${domain}`;
}

export function getOrderChannel(orderId: string): string {
  return `order:${orderId}`;
}

export function getStationChannel(locationId: string, stationId: string): string {
  return `location:${locationId}:station:${stationId}`;
}

// Event payload schemas
export const orderEventPayloadSchema = z.object({
  orderId: z.string(),
  orderNumber: z.number(),
  tableId: z.string().optional(),
  tableName: z.string().optional(),
  serverId: z.string(),
  serverName: z.string(),
  status: z.nativeEnum(OrderStatus),
  guestCount: z.number(),
  itemCount: z.number(),
  total: z.number(),
});
export type OrderEventPayload = z.infer<typeof orderEventPayloadSchema>;

export const orderItemEventPayloadSchema = z.object({
  orderId: z.string(),
  orderNumber: z.number(),
  orderItemId: z.string(),
  menuItemId: z.string(),
  menuItemName: z.string(),
  quantity: z.number(),
  seat: z.number(),
  course: z.number(),
  status: z.nativeEnum(OrderItemStatus),
  stationId: z.string().optional(),
  stationName: z.string().optional(),
  modifiers: z.array(z.string()).optional(),
  specialInstructions: z.string().optional(),
});
export type OrderItemEventPayload = z.infer<typeof orderItemEventPayloadSchema>;

export const ticketEventPayloadSchema = z.object({
  orderId: z.string(),
  orderNumber: z.number(),
  tableId: z.string().optional(),
  tableName: z.string().optional(),
  items: z.array(
    z.object({
      orderItemId: z.string(),
      menuItemName: z.string(),
      quantity: z.number(),
      seat: z.number(),
      course: z.number(),
      status: z.nativeEnum(OrderItemStatus),
      modifiers: z.array(z.string()),
      specialInstructions: z.string().optional(),
    })
  ),
  sentAt: z.string().datetime(),
});
export type TicketEventPayload = z.infer<typeof ticketEventPayloadSchema>;

export const eightySixEventPayloadSchema = z.object({
  menuItemId: z.string(),
  menuItemName: z.string(),
  reason: z.string().optional(),
  eightySixedById: z.string(),
  eightySixedByName: z.string(),
  timestamp: z.string().datetime(),
});
export type EightySixEventPayload = z.infer<typeof eightySixEventPayloadSchema>;

export const inventoryAlertPayloadSchema = z.object({
  inventoryItemId: z.string(),
  inventoryItemName: z.string(),
  currentStock: z.number(),
  unit: z.string(),
  parLevel: z.number().optional(),
  reorderPoint: z.number().optional(),
  alertType: z.enum(["low", "out", "updated"]),
});
export type InventoryAlertPayload = z.infer<typeof inventoryAlertPayloadSchema>;

export const freshnessAlertPayloadSchema = z.object({
  inventoryItemId: z.string(),
  inventoryItemName: z.string(),
  freshnessLogId: z.string(),
  batchId: z.string().optional(),
  quantity: z.number(),
  unit: z.string(),
  status: z.nativeEnum(FreshnessStatus),
  expiresAt: z.string().datetime().optional(),
});
export type FreshnessAlertPayload = z.infer<typeof freshnessAlertPayloadSchema>;

export const shiftEventPayloadSchema = z.object({
  shiftId: z.string(),
  userId: z.string(),
  userName: z.string(),
  role: z.string(),
  eventType: z.enum(["started", "ended", "break_started", "break_ended"]),
  timestamp: z.string().datetime(),
});
export type ShiftEventPayload = z.infer<typeof shiftEventPayloadSchema>;

export const announcementEventPayloadSchema = z.object({
  announcementId: z.string(),
  title: z.string(),
  content: z.string(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  createdByName: z.string(),
  createdAt: z.string().datetime(),
});
export type AnnouncementEventPayload = z.infer<typeof announcementEventPayloadSchema>;

export const prepTaskEventPayloadSchema = z.object({
  prepTaskId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  priority: z.nativeEnum(PrepPriority),
  status: z.nativeEnum(PrepStatus),
  dueAt: z.string().datetime().optional(),
  assignedToName: z.string().optional(),
});
export type PrepTaskEventPayload = z.infer<typeof prepTaskEventPayloadSchema>;

export const tableEventPayloadSchema = z.object({
  tableId: z.string(),
  tableName: z.string(),
  section: z.string().optional(),
  eventType: z.enum(["seated", "cleared"]),
  guestCount: z.number().optional(),
  orderId: z.string().optional(),
  timestamp: z.string().datetime(),
});
export type TableEventPayload = z.infer<typeof tableEventPayloadSchema>;
