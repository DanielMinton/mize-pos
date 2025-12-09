import { create } from "zustand";

interface Ticket {
  orderId: string;
  orderNumber: number;
  tableName: string;
  serverName: string;
  guestCount: number;
  firedAt: Date | null;
  ageMinutes: number;
  ticketStatus: "new" | "cooking" | "ready" | "late";
  items: Array<{
    id: string;
    name: string;
    kitchenName: string;
    quantity: number;
    seat: number;
    course: number;
    status: string;
    station: { id: string; name: string; shortName: string; color: string | null } | null;
    modifiers: string[];
    specialInstructions: string | null;
  }>;
}

interface KitchenStore {
  // Current station filter
  activeStationId: string | null;

  // View mode
  viewMode: "tickets" | "expo";

  // Tickets (cached for optimistic updates)
  tickets: Ticket[];

  // Audio enabled
  audioEnabled: boolean;

  // Actions
  setActiveStation: (stationId: string | null) => void;
  setViewMode: (mode: "tickets" | "expo") => void;
  setTickets: (tickets: Ticket[]) => void;
  updateTicket: (orderId: string, updates: Partial<Ticket>) => void;
  removeTicket: (orderId: string) => void;
  toggleAudio: () => void;

  // Helpers
  getFilteredTickets: () => Ticket[];
}

export const useKitchenStore = create<KitchenStore>((set, get) => ({
  activeStationId: null,
  viewMode: "tickets",
  tickets: [],
  audioEnabled: true,

  setActiveStation: (stationId) => {
    set({ activeStationId: stationId });
  },

  setViewMode: (mode) => {
    set({ viewMode: mode });
  },

  setTickets: (tickets) => {
    set({ tickets });
  },

  updateTicket: (orderId, updates) => {
    set((state) => ({
      tickets: state.tickets.map((ticket: typeof state.tickets[number]) =>
        ticket.orderId === orderId ? { ...ticket, ...updates } : ticket
      ),
    }));
  },

  removeTicket: (orderId) => {
    set((state) => ({
      tickets: state.tickets.filter((ticket: typeof state.tickets[number]) => ticket.orderId !== orderId),
    }));
  },

  toggleAudio: () => {
    set((state) => ({ audioEnabled: !state.audioEnabled }));
  },

  getFilteredTickets: () => {
    const state = get();
    if (!state.activeStationId) {
      return state.tickets;
    }

    return state.tickets
      .map((ticket: typeof state.tickets[number]) => ({
        ...ticket,
        items: ticket.items.filter(
          (item: typeof ticket.items[number]) => item.station?.id === state.activeStationId
        ),
      }))
      .filter((ticket: typeof state.tickets[number]) => ticket.items.length > 0);
  },
}));
