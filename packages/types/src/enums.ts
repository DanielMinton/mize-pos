// Mirror of Prisma enums for use without Prisma client
export const OrderType = {
  DINE_IN: "DINE_IN",
  TAKEOUT: "TAKEOUT",
  DELIVERY: "DELIVERY",
  BAR_TAB: "BAR_TAB",
} as const;
export type OrderType = (typeof OrderType)[keyof typeof OrderType];

export const OrderStatus = {
  OPEN: "OPEN",
  SENT: "SENT",
  IN_PROGRESS: "IN_PROGRESS",
  READY: "READY",
  SERVED: "SERVED",
  CLOSED: "CLOSED",
  VOID: "VOID",
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const OrderItemStatus = {
  PENDING: "PENDING",
  HELD: "HELD",
  FIRED: "FIRED",
  IN_PROGRESS: "IN_PROGRESS",
  READY: "READY",
  SERVED: "SERVED",
  VOID: "VOID",
} as const;
export type OrderItemStatus =
  (typeof OrderItemStatus)[keyof typeof OrderItemStatus];

export const PaymentMethod = {
  CASH: "CASH",
  CREDIT: "CREDIT",
  DEBIT: "DEBIT",
  GIFT_CARD: "GIFT_CARD",
  HOUSE_ACCOUNT: "HOUSE_ACCOUNT",
  COMP: "COMP",
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const DiscountType = {
  PERCENTAGE: "PERCENTAGE",
  FIXED: "FIXED",
} as const;
export type DiscountType = (typeof DiscountType)[keyof typeof DiscountType];

export const FreshnessStatus = {
  FRESH: "FRESH",
  USE_FIRST: "USE_FIRST",
  EXPIRING_SOON: "EXPIRING_SOON",
  EXPIRED: "EXPIRED",
} as const;
export type FreshnessStatus =
  (typeof FreshnessStatus)[keyof typeof FreshnessStatus];

export const PurchaseOrderStatus = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  CONFIRMED: "CONFIRMED",
  SHIPPED: "SHIPPED",
  RECEIVED: "RECEIVED",
  CANCELLED: "CANCELLED",
} as const;
export type PurchaseOrderStatus =
  (typeof PurchaseOrderStatus)[keyof typeof PurchaseOrderStatus];

export const WasteReason = {
  EXPIRED: "EXPIRED",
  SPOILED: "SPOILED",
  OVERPRODUCTION: "OVERPRODUCTION",
  CUSTOMER_RETURN: "CUSTOMER_RETURN",
  PREPARATION_ERROR: "PREPARATION_ERROR",
  SPILLAGE: "SPILLAGE",
  OTHER: "OTHER",
} as const;
export type WasteReason = (typeof WasteReason)[keyof typeof WasteReason];

export const PrepPriority = {
  LOW: "LOW",
  NORMAL: "NORMAL",
  HIGH: "HIGH",
  URGENT: "URGENT",
} as const;
export type PrepPriority = (typeof PrepPriority)[keyof typeof PrepPriority];

export const PrepStatus = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type PrepStatus = (typeof PrepStatus)[keyof typeof PrepStatus];

export const ShiftStatus = {
  SCHEDULED: "SCHEDULED",
  CONFIRMED: "CONFIRMED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  NO_SHOW: "NO_SHOW",
  CANCELLED: "CANCELLED",
} as const;
export type ShiftStatus = (typeof ShiftStatus)[keyof typeof ShiftStatus];

export const TimeEntryType = {
  CLOCK_IN: "CLOCK_IN",
  CLOCK_OUT: "CLOCK_OUT",
  BREAK_START: "BREAK_START",
  BREAK_END: "BREAK_END",
} as const;
export type TimeEntryType =
  (typeof TimeEntryType)[keyof typeof TimeEntryType];

export const BreakType = {
  PAID: "PAID",
  UNPAID: "UNPAID",
  MEAL: "MEAL",
} as const;
export type BreakType = (typeof BreakType)[keyof typeof BreakType];

export const PrinterType = {
  KITCHEN: "KITCHEN",
  BAR: "BAR",
  RECEIPT: "RECEIPT",
  LABEL: "LABEL",
} as const;
export type PrinterType = (typeof PrinterType)[keyof typeof PrinterType];

export const AnnouncementPriority = {
  LOW: "LOW",
  NORMAL: "NORMAL",
  HIGH: "HIGH",
  URGENT: "URGENT",
} as const;
export type AnnouncementPriority =
  (typeof AnnouncementPriority)[keyof typeof AnnouncementPriority];

export const SuggestionStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  USED: "USED",
} as const;
export type SuggestionStatus =
  (typeof SuggestionStatus)[keyof typeof SuggestionStatus];
