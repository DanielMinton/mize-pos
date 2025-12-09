import { create } from "zustand";
import type {
  Order,
  OrderItem,
  MenuItem,
  Modifier,
} from "@mise-pos/database";

interface OrderItemWithDetails extends OrderItem {
  menuItem: MenuItem;
  modifiers: Array<{ modifierId: string; name: string; priceAdjustment: number }>;
}

interface CurrentOrder {
  id?: string;
  orderNumber?: number;
  tableId?: string;
  tableName?: string;
  guestCount: number;
  type: "DINE_IN" | "TAKEOUT" | "DELIVERY" | "BAR_TAB";
  tabName?: string;
  items: OrderItemWithDetails[];
}

interface ModifierSelection {
  menuItem: MenuItem & {
    modifierGroups: Array<{
      modifierGroup: {
        id: string;
        name: string;
        displayName: string | null;
        required: boolean;
        multiSelect: boolean;
        minSelections: number;
        maxSelections: number | null;
        modifiers: Modifier[];
      };
      required: boolean | null;
      minSelections: number | null;
      maxSelections: number | null;
    }>;
  };
  selectedModifiers: Map<string, string[]>; // groupId -> modifierIds
  specialInstructions: string;
  quantity: number;
  seat: number;
  course: number;
}

interface OrderStore {
  // Current order being built
  currentOrder: CurrentOrder | null;

  // Modifier selection modal state
  modifierSelection: ModifierSelection | null;

  // Actions
  startNewOrder: (params: {
    tableId?: string;
    tableName?: string;
    guestCount: number;
    type: CurrentOrder["type"];
    tabName?: string;
  }) => void;

  loadOrder: (order: Order & { items: OrderItemWithDetails[] }) => void;

  clearCurrentOrder: () => void;

  // Item actions
  openModifierSelection: (menuItem: ModifierSelection["menuItem"]) => void;
  closeModifierSelection: () => void;
  setModifierSelection: (groupId: string, modifierIds: string[]) => void;
  setSpecialInstructions: (instructions: string) => void;
  setItemQuantity: (quantity: number) => void;
  setItemSeat: (seat: number) => void;
  setItemCourse: (course: number) => void;

  confirmItemAddition: () => {
    menuItemId: string;
    quantity: number;
    seat: number;
    course: number;
    specialInstructions?: string;
    modifiers: Array<{ modifierId: string; name: string; priceAdjustment: number }>;
  } | null;

  // After item is added to order
  addItemToOrder: (item: OrderItemWithDetails) => void;
  updateItemInOrder: (itemId: string, updates: Partial<OrderItemWithDetails>) => void;
  removeItemFromOrder: (itemId: string) => void;

  // Order totals (calculated)
  getSubtotal: () => number;
  getItemCount: () => number;
}

export const useOrderStore = create<OrderStore>((set, get) => ({
  currentOrder: null,
  modifierSelection: null,

  startNewOrder: (params) => {
    set({
      currentOrder: {
        guestCount: params.guestCount,
        type: params.type,
        tableId: params.tableId,
        tableName: params.tableName,
        tabName: params.tabName,
        items: [],
      },
    });
  },

  loadOrder: (order) => {
    set({
      currentOrder: {
        id: order.id,
        orderNumber: order.orderNumber,
        tableId: order.tableId || undefined,
        guestCount: order.guestCount,
        type: order.type as CurrentOrder["type"],
        tabName: order.tabName || undefined,
        items: order.items,
      },
    });
  },

  clearCurrentOrder: () => {
    set({ currentOrder: null, modifierSelection: null });
  },

  openModifierSelection: (menuItem) => {
    // Initialize with default modifiers
    const selectedModifiers = new Map<string, string[]>();

    menuItem.modifierGroups.forEach((mg: typeof menuItem.modifierGroups[number]) => {
      const defaults = mg.modifierGroup.modifiers
        .filter((m: typeof mg.modifierGroup.modifiers[number]) => m.isDefault)
        .map((m: typeof mg.modifierGroup.modifiers[number]) => m.id);
      if (defaults.length > 0) {
        selectedModifiers.set(mg.modifierGroup.id, defaults);
      }
    });

    set({
      modifierSelection: {
        menuItem,
        selectedModifiers,
        specialInstructions: "",
        quantity: 1,
        seat: 1,
        course: 1,
      },
    });
  },

  closeModifierSelection: () => {
    set({ modifierSelection: null });
  },

  setModifierSelection: (groupId, modifierIds) => {
    const current = get().modifierSelection;
    if (!current) return;

    const newSelected = new Map(current.selectedModifiers);
    newSelected.set(groupId, modifierIds);

    set({
      modifierSelection: {
        ...current,
        selectedModifiers: newSelected,
      },
    });
  },

  setSpecialInstructions: (instructions) => {
    const current = get().modifierSelection;
    if (!current) return;
    set({
      modifierSelection: { ...current, specialInstructions: instructions },
    });
  },

  setItemQuantity: (quantity) => {
    const current = get().modifierSelection;
    if (!current) return;
    set({
      modifierSelection: { ...current, quantity: Math.max(1, quantity) },
    });
  },

  setItemSeat: (seat) => {
    const current = get().modifierSelection;
    if (!current) return;
    set({
      modifierSelection: { ...current, seat: Math.max(1, seat) },
    });
  },

  setItemCourse: (course) => {
    const current = get().modifierSelection;
    if (!current) return;
    set({
      modifierSelection: { ...current, course: Math.max(1, course) },
    });
  },

  confirmItemAddition: () => {
    const selection = get().modifierSelection;
    if (!selection) return null;

    // Validate required modifiers
    for (const mg of selection.menuItem.modifierGroups) {
      const required = mg.required ?? mg.modifierGroup.required;
      const selected = selection.selectedModifiers.get(mg.modifierGroup.id) || [];
      const minSelections = mg.minSelections ?? mg.modifierGroup.minSelections;

      if (required && selected.length < Math.max(1, minSelections)) {
        // Validation failed
        return null;
      }
    }

    // Build modifiers array
    const modifiers: Array<{ modifierId: string; name: string; priceAdjustment: number }> = [];

    selection.selectedModifiers.forEach((modifierIds: string[], groupId: string) => {
      const group = selection.menuItem.modifierGroups.find(
        (mg: typeof selection.menuItem.modifierGroups[number]) => mg.modifierGroup.id === groupId
      );
      if (!group) return;

      modifierIds.forEach((modifierId: string) => {
        const modifier = group.modifierGroup.modifiers.find((m: typeof group.modifierGroup.modifiers[number]) => m.id === modifierId);
        if (modifier) {
          modifiers.push({
            modifierId: modifier.id,
            name: modifier.name,
            priceAdjustment: Number(modifier.priceAdjustment),
          });
        }
      });
    });

    return {
      menuItemId: selection.menuItem.id,
      quantity: selection.quantity,
      seat: selection.seat,
      course: selection.course,
      specialInstructions: selection.specialInstructions || undefined,
      modifiers,
    };
  },

  addItemToOrder: (item) => {
    const current = get().currentOrder;
    if (!current) return;

    set({
      currentOrder: {
        ...current,
        items: [...current.items, item],
      },
      modifierSelection: null,
    });
  },

  updateItemInOrder: (itemId, updates) => {
    const current = get().currentOrder;
    if (!current) return;

    set({
      currentOrder: {
        ...current,
        items: current.items.map((item: typeof current.items[number]) =>
          item.id === itemId ? { ...item, ...updates } : item
        ),
      },
    });
  },

  removeItemFromOrder: (itemId) => {
    const current = get().currentOrder;
    if (!current) return;

    set({
      currentOrder: {
        ...current,
        items: current.items.filter((item: typeof current.items[number]) => item.id !== itemId),
      },
    });
  },

  getSubtotal: () => {
    const current = get().currentOrder;
    if (!current) return 0;

    return current.items
      .filter((item: typeof current.items[number]) => item.status !== "VOID")
      .reduce((sum: number, item: typeof current.items[number]) => sum + Number(item.totalPrice), 0);
  },

  getItemCount: () => {
    const current = get().currentOrder;
    if (!current) return 0;

    return current.items
      .filter((item: typeof current.items[number]) => item.status !== "VOID")
      .reduce((sum: number, item: typeof current.items[number]) => sum + item.quantity, 0);
  },
}));
