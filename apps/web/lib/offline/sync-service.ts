"use client";

import { create } from "zustand";
import {
  getPendingActions,
  removePendingAction,
  getPendingActionCount,
  incrementRetryCount,
} from "./indexed-db";

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: number | null;
  syncError: string | null;
}

interface SyncStore extends SyncState {
  setOnline: (online: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setPendingCount: (count: number) => void;
  setLastSyncAt: (timestamp: number) => void;
  setSyncError: (error: string | null) => void;
  refreshPendingCount: () => Promise<void>;
}

export const useSyncStore = create<SyncStore>((set) => ({
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  isSyncing: false,
  pendingCount: 0,
  lastSyncAt: null,
  syncError: null,

  setOnline: (online) => set({ isOnline: online }),
  setSyncing: (syncing) => set({ isSyncing: syncing }),
  setPendingCount: (count) => set({ pendingCount: count }),
  setLastSyncAt: (timestamp) => set({ lastSyncAt: timestamp }),
  setSyncError: (error) => set({ syncError: error }),

  refreshPendingCount: async () => {
    const count = await getPendingActionCount();
    set({ pendingCount: count });
  },
}));

const MAX_RETRIES = 3;

type ActionHandler = (payload: Record<string, unknown>) => Promise<void>;

// Action handlers for different action types
const actionHandlers: Record<string, ActionHandler> = {
  createOrder: async (_payload) => {
    // This would be injected by the app
    throw new Error("Handler not registered");
  },
  addItem: async (_payload) => {
    throw new Error("Handler not registered");
  },
  fireOrder: async (_payload) => {
    throw new Error("Handler not registered");
  },
  holdItems: async (_payload) => {
    throw new Error("Handler not registered");
  },
  removeItem: async (_payload) => {
    throw new Error("Handler not registered");
  },
  updateItem: async (_payload) => {
    throw new Error("Handler not registered");
  },
};

export function registerActionHandler(type: string, handler: ActionHandler) {
  actionHandlers[type] = handler;
}

export async function syncPendingActions(): Promise<{ success: number; failed: number }> {
  const store = useSyncStore.getState();

  if (!store.isOnline) {
    return { success: 0, failed: 0 };
  }

  store.setSyncing(true);
  store.setSyncError(null);

  let success = 0;
  let failed = 0;

  try {
    const actions = await getPendingActions();

    for (const action of actions) {
      const handler = actionHandlers[action.type];

      if (!handler) {
        console.warn(`No handler for action type: ${action.type}`);
        continue;
      }

      try {
        await handler(action.payload);
        await removePendingAction(action.id);
        success++;
      } catch (error) {
        console.error(`Failed to sync action ${action.id}:`, error);

        if (action.retryCount >= MAX_RETRIES) {
          // Mark as permanently failed, keep in queue for manual review
          failed++;
        } else {
          await incrementRetryCount(action.id);
        }
      }
    }

    store.setLastSyncAt(Date.now());
    await store.refreshPendingCount();
  } catch (error) {
    console.error("Sync failed:", error);
    store.setSyncError(error instanceof Error ? error.message : "Sync failed");
    failed++;
  } finally {
    store.setSyncing(false);
  }

  return { success, failed };
}

// Initialize online/offline listeners
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    useSyncStore.getState().setOnline(true);
    // Auto-sync when coming back online
    syncPendingActions();
  });

  window.addEventListener("offline", () => {
    useSyncStore.getState().setOnline(false);
  });

  // Initial pending count
  getPendingActionCount().then((count) => {
    useSyncStore.getState().setPendingCount(count);
  });
}

// Periodic sync check (every 30 seconds when online)
if (typeof window !== "undefined") {
  setInterval(() => {
    const store = useSyncStore.getState();
    if (store.isOnline && store.pendingCount > 0 && !store.isSyncing) {
      syncPendingActions();
    }
  }, 30000);
}
