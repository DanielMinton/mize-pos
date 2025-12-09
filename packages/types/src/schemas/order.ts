import { z } from "zod";
import { OrderType, OrderStatus, OrderItemStatus, PaymentMethod, DiscountType } from "../enums";

// Order schemas
export const createOrderSchema = z.object({
  locationId: z.string().cuid(),
  type: z.nativeEnum(OrderType).default("DINE_IN"),
  tableId: z.string().cuid().optional(),
  guestCount: z.number().int().positive().default(1),
  tabName: z.string().optional(),
  serverId: z.string().cuid(),
  guestName: z.string().optional(),
  guestPhone: z.string().optional(),
  guestNotes: z.string().optional(),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const updateOrderSchema = z.object({
  id: z.string().cuid(),
  tableId: z.string().cuid().optional().nullable(),
  guestCount: z.number().int().positive().optional(),
  tabName: z.string().optional().nullable(),
  guestName: z.string().optional().nullable(),
  guestPhone: z.string().optional().nullable(),
  guestNotes: z.string().optional().nullable(),
  status: z.nativeEnum(OrderStatus).optional(),
});
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;

// Order Item schemas
export const addOrderItemSchema = z.object({
  orderId: z.string().cuid(),
  menuItemId: z.string().cuid(),
  quantity: z.number().int().positive().default(1),
  seat: z.number().int().positive().default(1),
  course: z.number().int().positive().default(1),
  specialInstructions: z.string().optional(),
  modifiers: z
    .array(
      z.object({
        modifierId: z.string().cuid(),
        name: z.string(),
        priceAdjustment: z.number(),
      })
    )
    .optional(),
});
export type AddOrderItemInput = z.infer<typeof addOrderItemSchema>;

export const updateOrderItemSchema = z.object({
  id: z.string().cuid(),
  quantity: z.number().int().positive().optional(),
  seat: z.number().int().positive().optional(),
  course: z.number().int().positive().optional(),
  specialInstructions: z.string().optional().nullable(),
  status: z.nativeEnum(OrderItemStatus).optional(),
});
export type UpdateOrderItemInput = z.infer<typeof updateOrderItemSchema>;

// Fire/Hold order items
export const fireOrderItemsSchema = z.object({
  orderItemIds: z.array(z.string().cuid()).min(1),
});
export type FireOrderItemsInput = z.infer<typeof fireOrderItemsSchema>;

export const fireOrderSchema = z.object({
  orderId: z.string().cuid(),
  course: z.number().int().positive().optional(), // Fire specific course, or all pending
});
export type FireOrderInput = z.infer<typeof fireOrderSchema>;

export const holdOrderItemsSchema = z.object({
  orderItemIds: z.array(z.string().cuid()).min(1),
});
export type HoldOrderItemsInput = z.infer<typeof holdOrderItemsSchema>;

// Bump (kitchen marks ready)
export const bumpOrderItemSchema = z.object({
  orderItemId: z.string().cuid(),
});
export type BumpOrderItemInput = z.infer<typeof bumpOrderItemSchema>;

export const bumpTicketSchema = z.object({
  orderId: z.string().cuid(),
  stationId: z.string().cuid().optional(), // Bump all items for station, or all
});
export type BumpTicketInput = z.infer<typeof bumpTicketSchema>;

// Serve
export const serveOrderItemSchema = z.object({
  orderItemId: z.string().cuid(),
});
export type ServeOrderItemInput = z.infer<typeof serveOrderItemSchema>;

// Void schemas
export const voidOrderItemSchema = z.object({
  orderItemId: z.string().cuid(),
  reason: z.string().min(1, "Void reason is required"),
  approvedById: z.string().cuid(),
});
export type VoidOrderItemInput = z.infer<typeof voidOrderItemSchema>;

// Comp schemas
export const addCompSchema = z.object({
  orderId: z.string().cuid(),
  reason: z.string().min(1, "Comp reason is required"),
  amount: z.number().positive("Comp amount must be positive"),
  approvedById: z.string().cuid(),
});
export type AddCompInput = z.infer<typeof addCompSchema>;

// Discount schemas
export const addDiscountSchema = z.object({
  orderId: z.string().cuid(),
  name: z.string().min(1, "Discount name is required"),
  type: z.nativeEnum(DiscountType),
  value: z.number().positive("Discount value must be positive"),
  approvedById: z.string().cuid().optional(),
});
export type AddDiscountInput = z.infer<typeof addDiscountSchema>;

// Payment schemas
export const addPaymentSchema = z.object({
  orderId: z.string().cuid(),
  checkId: z.string().cuid().optional(),
  method: z.nativeEnum(PaymentMethod),
  amount: z.number().positive("Payment amount must be positive"),
  tipAmount: z.number().nonnegative().default(0),
  cardLast4: z.string().length(4).optional(),
  cardBrand: z.string().optional(),
  transactionId: z.string().optional(),
});
export type AddPaymentInput = z.infer<typeof addPaymentSchema>;

// Split check schemas
export const splitCheckSchema = z.object({
  orderId: z.string().cuid(),
  splits: z.array(
    z.object({
      name: z.string().optional(),
      orderItemIds: z.array(z.string().cuid()),
    })
  ),
});
export type SplitCheckInput = z.infer<typeof splitCheckSchema>;

export const splitCheckBySeatSchema = z.object({
  orderId: z.string().cuid(),
});
export type SplitCheckBySeatInput = z.infer<typeof splitCheckBySeatSchema>;

export const splitCheckEvenlySchema = z.object({
  orderId: z.string().cuid(),
  numberOfChecks: z.number().int().min(2),
});
export type SplitCheckEvenlyInput = z.infer<typeof splitCheckEvenlySchema>;

// Close order
export const closeOrderSchema = z.object({
  orderId: z.string().cuid(),
});
export type CloseOrderInput = z.infer<typeof closeOrderSchema>;

// Transfer table
export const transferTableSchema = z.object({
  orderId: z.string().cuid(),
  newTableId: z.string().cuid(),
});
export type TransferTableInput = z.infer<typeof transferTableSchema>;

// Merge orders
export const mergeOrdersSchema = z.object({
  sourceOrderId: z.string().cuid(),
  targetOrderId: z.string().cuid(),
});
export type MergeOrdersInput = z.infer<typeof mergeOrdersSchema>;
