import { create } from "zustand";

interface POSStore {
  // Current location
  locationId: string | null;
  locationName: string | null;

  // Active menu category for display
  activeCategoryId: string | null;

  // Search/filter
  searchQuery: string;

  // 86'd items cache (for quick lookup)
  eightySixedItems: Set<string>;

  // UI state
  isSidebarOpen: boolean;
  isModifierModalOpen: boolean;

  // Actions
  setLocation: (id: string, name: string) => void;
  setActiveCategory: (categoryId: string | null) => void;
  setSearchQuery: (query: string) => void;
  addEightySixedItem: (itemId: string) => void;
  removeEightySixedItem: (itemId: string) => void;
  setEightySixedItems: (itemIds: string[]) => void;
  isItemEightySixed: (itemId: string) => boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setModifierModalOpen: (open: boolean) => void;
}

export const usePOSStore = create<POSStore>((set, get) => ({
  locationId: null,
  locationName: null,
  activeCategoryId: null,
  searchQuery: "",
  eightySixedItems: new Set(),
  isSidebarOpen: true,
  isModifierModalOpen: false,

  setLocation: (id, name) => {
    set({ locationId: id, locationName: name });
  },

  setActiveCategory: (categoryId) => {
    set({ activeCategoryId: categoryId });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  addEightySixedItem: (itemId) => {
    set((state) => ({
      eightySixedItems: new Set([...state.eightySixedItems, itemId]),
    }));
  },

  removeEightySixedItem: (itemId) => {
    set((state) => {
      const newSet = new Set(state.eightySixedItems);
      newSet.delete(itemId);
      return { eightySixedItems: newSet };
    });
  },

  setEightySixedItems: (itemIds) => {
    set({ eightySixedItems: new Set(itemIds) });
  },

  isItemEightySixed: (itemId) => {
    return get().eightySixedItems.has(itemId);
  },

  toggleSidebar: () => {
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen }));
  },

  setSidebarOpen: (open) => {
    set({ isSidebarOpen: open });
  },

  setModifierModalOpen: (open) => {
    set({ isModifierModalOpen: open });
  },
}));
