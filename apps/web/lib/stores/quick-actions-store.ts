"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface QuickActionItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  categoryName: string;
  hasModifiers: boolean;
  addedAt: number;
}

interface QuickActionsStore {
  // Recent items (last 10 added)
  recentItems: QuickActionItem[];

  // User favorites (pinned items)
  favoriteItems: QuickActionItem[];

  // Last order items for "repeat last" functionality
  lastOrderItems: QuickActionItem[];

  // Actions
  addRecentItem: (item: Omit<QuickActionItem, "addedAt">) => void;
  toggleFavorite: (item: Omit<QuickActionItem, "addedAt">) => void;
  isFavorite: (menuItemId: string) => boolean;
  setLastOrder: (items: Omit<QuickActionItem, "addedAt">[]) => void;
  clearRecentItems: () => void;
  clearLastOrder: () => void;
}

const MAX_RECENT_ITEMS = 10;
const MAX_FAVORITES = 20;

export const useQuickActionsStore = create<QuickActionsStore>()(
  persist(
    (set, get) => ({
      recentItems: [],
      favoriteItems: [],
      lastOrderItems: [],

      addRecentItem: (item) => {
        set((state) => {
          // Remove if already exists
          const filtered = state.recentItems.filter(
            (r) => r.menuItemId !== item.menuItemId
          );

          // Add to front with timestamp
          const newRecent = [
            { ...item, addedAt: Date.now() },
            ...filtered,
          ].slice(0, MAX_RECENT_ITEMS);

          return { recentItems: newRecent };
        });
      },

      toggleFavorite: (item) => {
        set((state) => {
          const exists = state.favoriteItems.some(
            (f) => f.menuItemId === item.menuItemId
          );

          if (exists) {
            // Remove from favorites
            return {
              favoriteItems: state.favoriteItems.filter(
                (f) => f.menuItemId !== item.menuItemId
              ),
            };
          } else {
            // Add to favorites (up to max)
            const newFavorites = [
              { ...item, addedAt: Date.now() },
              ...state.favoriteItems,
            ].slice(0, MAX_FAVORITES);

            return { favoriteItems: newFavorites };
          }
        });
      },

      isFavorite: (menuItemId) => {
        return get().favoriteItems.some((f) => f.menuItemId === menuItemId);
      },

      setLastOrder: (items) => {
        set({
          lastOrderItems: items.map((item) => ({
            ...item,
            addedAt: Date.now(),
          })),
        });
      },

      clearRecentItems: () => {
        set({ recentItems: [] });
      },

      clearLastOrder: () => {
        set({ lastOrderItems: [] });
      },
    }),
    {
      name: "mise-quick-actions",
      partialize: (state) => ({
        recentItems: state.recentItems,
        favoriteItems: state.favoriteItems,
        // Don't persist lastOrderItems - session only
      }),
    }
  )
);
