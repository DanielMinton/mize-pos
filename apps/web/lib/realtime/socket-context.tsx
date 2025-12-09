"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

// Event types
export type RealTimeEvent =
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

export interface RealTimePayload {
  event: RealTimeEvent;
  locationId: string;
  data: unknown;
  timestamp: Date;
  userId?: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinLocation: (locationId: string) => void;
  leaveLocation: (locationId: string) => void;
  emit: (event: RealTimeEvent, data: unknown) => void;
  subscribe: (event: RealTimeEvent, callback: (payload: RealTimePayload) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!session?.user) return;

    // Initialize socket connection
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || "", {
      path: "/api/socket",
      auth: {
        userId: session.user.id,
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on("connect", () => {
      console.log("Socket connected:", socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      setIsConnected(false);
    });

    socketInstance.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [session?.user]);

  const joinLocation = useCallback(
    (locationId: string) => {
      if (socket && isConnected) {
        socket.emit("join:location", locationId);
        console.log("Joined location:", locationId);
      }
    },
    [socket, isConnected]
  );

  const leaveLocation = useCallback(
    (locationId: string) => {
      if (socket && isConnected) {
        socket.emit("leave:location", locationId);
        console.log("Left location:", locationId);
      }
    },
    [socket, isConnected]
  );

  const emit = useCallback(
    (event: RealTimeEvent, data: unknown) => {
      if (socket && isConnected) {
        socket.emit(event, data);
      }
    },
    [socket, isConnected]
  );

  const subscribe = useCallback(
    (event: RealTimeEvent, callback: (payload: RealTimePayload) => void) => {
      if (!socket) return () => {};

      socket.on(event, callback);
      return () => {
        socket.off(event, callback);
      };
    },
    [socket]
  );

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        joinLocation,
        leaveLocation,
        emit,
        subscribe,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}

// Hook for subscribing to specific events
export function useRealTimeEvent(
  event: RealTimeEvent,
  callback: (payload: RealTimePayload) => void,
  deps: unknown[] = []
) {
  const { subscribe } = useSocket();

  useEffect(() => {
    const unsubscribe = subscribe(event, callback);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, subscribe, ...deps]);
}

// Hook for 86 updates specifically
export function useEightySixUpdates(
  locationId: string,
  onEightySix: (itemId: string, isEightySixed: boolean) => void
) {
  const { subscribe, joinLocation, leaveLocation } = useSocket();

  useEffect(() => {
    joinLocation(locationId);

    const unsubscribe86 = subscribe("ITEM_EIGHTY_SIXED", (payload) => {
      if (payload.locationId === locationId) {
        onEightySix((payload.data as { menuItemId: string }).menuItemId, true);
      }
    });

    const unsubscribeAvailable = subscribe("ITEM_AVAILABLE", (payload) => {
      if (payload.locationId === locationId) {
        onEightySix((payload.data as { menuItemId: string }).menuItemId, false);
      }
    });

    return () => {
      leaveLocation(locationId);
      unsubscribe86();
      unsubscribeAvailable();
    };
  }, [locationId, joinLocation, leaveLocation, subscribe, onEightySix]);
}
