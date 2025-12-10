"use client";

import { openDB, type IDBPDatabase } from "idb";

interface PendingAction {
  id: string;
  type: "createOrder" | "addItem" | "fireOrder" | "holdItems" | "removeItem" | "updateItem";
  payload: Record<string, unknown>;
  createdAt: number;
  retryCount: number;
}

interface CachedOrder {
  id: string;
  data: Record<string, unknown>;
  updatedAt: number;
}

interface CachedMenuItem {
  id: string;
  data: Record<string, unknown>;
  updatedAt: number;
}

interface MisePOSDB {
  "pending-actions": {
    key: string;
    value: PendingAction;
    indexes: { "by-created": number };
  };
  "orders": {
    key: string;
    value: CachedOrder;
    indexes: { "by-updated": number };
  };
  "menu-cache": {
    key: string;
    value: CachedMenuItem;
  };
}

const DB_NAME = "mise-pos-offline";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<MisePOSDB>> | null = null;

async function getDB(): Promise<IDBPDatabase<MisePOSDB>> {
  if (!dbPromise) {
    dbPromise = openDB<MisePOSDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Pending actions store
        if (!db.objectStoreNames.contains("pending-actions")) {
          const actionsStore = db.createObjectStore("pending-actions", {
            keyPath: "id",
          });
          actionsStore.createIndex("by-created", "createdAt");
        }

        // Orders cache store
        if (!db.objectStoreNames.contains("orders")) {
          const ordersStore = db.createObjectStore("orders", {
            keyPath: "id",
          });
          ordersStore.createIndex("by-updated", "updatedAt");
        }

        // Menu cache store
        if (!db.objectStoreNames.contains("menu-cache")) {
          db.createObjectStore("menu-cache", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

// Pending Actions API
export async function addPendingAction(
  type: PendingAction["type"],
  payload: Record<string, unknown>
): Promise<string> {
  const db = await getDB();
  const id = crypto.randomUUID();
  const action: PendingAction = {
    id,
    type,
    payload,
    createdAt: Date.now(),
    retryCount: 0,
  };
  await db.put("pending-actions", action);
  return id;
}

export async function getPendingActions(): Promise<PendingAction[]> {
  const db = await getDB();
  return db.getAllFromIndex("pending-actions", "by-created");
}

export async function getPendingActionCount(): Promise<number> {
  const db = await getDB();
  return db.count("pending-actions");
}

export async function removePendingAction(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("pending-actions", id);
}

export async function incrementRetryCount(id: string): Promise<void> {
  const db = await getDB();
  const action = await db.get("pending-actions", id);
  if (action) {
    action.retryCount += 1;
    await db.put("pending-actions", action);
  }
}

export async function clearAllPendingActions(): Promise<void> {
  const db = await getDB();
  await db.clear("pending-actions");
}

// Orders Cache API
export async function cacheOrder(
  id: string,
  data: Record<string, unknown>
): Promise<void> {
  const db = await getDB();
  await db.put("orders", {
    id,
    data,
    updatedAt: Date.now(),
  });
}

export async function getCachedOrder(id: string): Promise<CachedOrder | undefined> {
  const db = await getDB();
  return db.get("orders", id);
}

export async function getAllCachedOrders(): Promise<CachedOrder[]> {
  const db = await getDB();
  return db.getAllFromIndex("orders", "by-updated");
}

export async function removeCachedOrder(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("orders", id);
}

// Menu Cache API
export async function cacheMenuItem(
  id: string,
  data: Record<string, unknown>
): Promise<void> {
  const db = await getDB();
  await db.put("menu-cache", {
    id,
    data,
    updatedAt: Date.now(),
  });
}

export async function getCachedMenuItem(id: string): Promise<CachedMenuItem | undefined> {
  const db = await getDB();
  return db.get("menu-cache", id);
}

export async function cacheMenuData(items: Array<{ id: string; data: Record<string, unknown> }>): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("menu-cache", "readwrite");
  await Promise.all([
    ...items.map((item) => tx.store.put({ id: item.id, data: item.data, updatedAt: Date.now() })),
    tx.done,
  ]);
}

export async function getAllCachedMenuItems(): Promise<CachedMenuItem[]> {
  const db = await getDB();
  return db.getAll("menu-cache");
}

export async function clearMenuCache(): Promise<void> {
  const db = await getDB();
  await db.clear("menu-cache");
}
