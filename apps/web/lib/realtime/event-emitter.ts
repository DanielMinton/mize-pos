import { prisma } from "@mise-pos/database/client";

// Server-side event emitter for broadcasting real-time updates
// This works with Redis pub/sub for multi-instance deployments

export type BroadcastEvent =
  | "ORDER_CREATED"
  | "ORDER_UPDATED"
  | "ORDER_FIRED"
  | "ORDER_COMPLETED"
  | "ORDER_CLOSED"
  | "ITEM_ADDED"
  | "ITEM_UPDATED"
  | "ITEM_REMOVED"
  | "ITEM_EIGHTY_SIXED"
  | "ITEM_AVAILABLE"
  | "TICKET_BUMPED"
  | "TICKET_RECALLED"
  | "INVENTORY_LOW"
  | "INVENTORY_OUT"
  | "INVENTORY_UPDATED"
  | "SHIFT_STARTED"
  | "SHIFT_ENDED"
  | "ANNOUNCEMENT"
  | "TABLE_STATUS_CHANGED";

export interface BroadcastPayload {
  event: BroadcastEvent;
  locationId: string;
  data: unknown;
  timestamp: Date;
  userId?: string;
}

// In-memory event store for SSE (Server-Sent Events) fallback
// In production, this would be Redis
class EventStore {
  private events: Map<string, BroadcastPayload[]> = new Map();
  private listeners: Map<string, Set<(payload: BroadcastPayload) => void>> = new Map();
  private maxEventsPerLocation = 100;

  addEvent(payload: BroadcastPayload) {
    const key = payload.locationId;

    if (!this.events.has(key)) {
      this.events.set(key, []);
    }

    const locationEvents = this.events.get(key)!;
    locationEvents.push(payload);

    // Trim old events
    if (locationEvents.length > this.maxEventsPerLocation) {
      locationEvents.shift();
    }

    // Notify listeners
    const locationListeners = this.listeners.get(key);
    if (locationListeners) {
      locationListeners.forEach((listener) => listener(payload));
    }
  }

  subscribe(locationId: string, callback: (payload: BroadcastPayload) => void) {
    if (!this.listeners.has(locationId)) {
      this.listeners.set(locationId, new Set());
    }
    this.listeners.get(locationId)!.add(callback);

    return () => {
      this.listeners.get(locationId)?.delete(callback);
    };
  }

  getRecentEvents(locationId: string, since?: Date): BroadcastPayload[] {
    const events = this.events.get(locationId) || [];
    if (!since) return events;
    return events.filter((e) => e.timestamp > since);
  }
}

export const eventStore = new EventStore();

// Broadcast function to emit events
export async function broadcast(
  event: BroadcastEvent,
  locationId: string,
  data: unknown,
  userId?: string
) {
  const payload: BroadcastPayload = {
    event,
    locationId,
    data,
    timestamp: new Date(),
    userId,
  };

  // Add to event store (triggers listeners)
  eventStore.addEvent(payload);

  // In production, also publish to Redis for multi-instance support
  // await redis.publish(`location:${locationId}`, JSON.stringify(payload));

  return payload;
}

// Helper functions for common events
export async function broadcastOrderCreated(locationId: string, orderId: string, userId?: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          menuItem: true,
          modifiers: true,
        },
      },
      table: true,
      server: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  return broadcast("ORDER_CREATED", locationId, order, userId);
}

export async function broadcastOrderUpdated(locationId: string, orderId: string, userId?: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          menuItem: true,
          modifiers: true,
        },
      },
      table: true,
    },
  });

  return broadcast("ORDER_UPDATED", locationId, order, userId);
}

export async function broadcastOrderFired(locationId: string, orderId: string, userId?: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        where: { status: "FIRED" },
        include: {
          menuItem: {
            include: { station: true },
          },
          modifiers: true,
        },
      },
      table: true,
      server: {
        select: { firstName: true, lastName: true },
      },
    },
  });

  return broadcast("ORDER_FIRED", locationId, order, userId);
}

export async function broadcastEightySix(
  locationId: string,
  menuItemId: string,
  isEightySixed: boolean,
  reason?: string,
  userId?: string
) {
  const menuItem = await prisma.menuItem.findUnique({
    where: { id: menuItemId },
    select: { id: true, name: true, kitchenName: true },
  });

  return broadcast(
    isEightySixed ? "ITEM_EIGHTY_SIXED" : "ITEM_AVAILABLE",
    locationId,
    {
      menuItemId,
      menuItem,
      reason,
      timestamp: new Date(),
    },
    userId
  );
}

export async function broadcastTicketBumped(
  locationId: string,
  orderId: string,
  itemIds: string[],
  stationId: string,
  userId?: string
) {
  return broadcast(
    "TICKET_BUMPED",
    locationId,
    {
      orderId,
      itemIds,
      stationId,
      timestamp: new Date(),
    },
    userId
  );
}

export async function broadcastInventoryAlert(
  locationId: string,
  inventoryItemId: string,
  alertType: "low" | "out",
  userId?: string
) {
  const item = await prisma.inventoryItem.findUnique({
    where: { id: inventoryItemId },
    select: {
      id: true,
      name: true,
      currentStock: true,
      parLevel: true,
      reorderPoint: true,
      unit: true,
    },
  });

  return broadcast(
    alertType === "out" ? "INVENTORY_OUT" : "INVENTORY_LOW",
    locationId,
    item,
    userId
  );
}

export async function broadcastAnnouncement(
  locationId: string,
  announcementId: string,
  userId?: string
) {
  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
    include: {
      createdBy: {
        select: { firstName: true, lastName: true },
      },
    },
  });

  return broadcast("ANNOUNCEMENT", locationId, announcement, userId);
}
