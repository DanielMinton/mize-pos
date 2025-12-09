"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { TicketCard, StationTabs } from "@/components/kds";
import { trpc } from "@/lib/api/trpc";
import { useKitchenStore } from "@/lib/stores";
import { toast } from "@/lib/hooks/use-toast";
import { RefreshCw, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

// Demo location
const DEMO_LOCATION_ID = "demo-location-id";

export default function KDSPage() {
  const { data: session, status } = useSession();
  const {
    activeStationId,
    viewMode,
    tickets,
    setTickets,
    audioEnabled,
    toggleAudio,
    getFilteredTickets,
  } = useKitchenStore();

  // Fetch tickets
  const { data: ticketsData, isLoading, refetch } = trpc.kitchen.getTickets.useQuery(
    {
      locationId: DEMO_LOCATION_ID,
      stationId: activeStationId || undefined,
    },
    {
      enabled: status === "authenticated",
      refetchInterval: 5000, // Poll every 5 seconds (replace with WebSocket)
    }
  );

  // Fetch station summary
  const { data: stationSummary } = trpc.kitchen.getStationSummary.useQuery(
    { locationId: DEMO_LOCATION_ID },
    { enabled: status === "authenticated", refetchInterval: 5000 }
  );

  // Fetch timing stats
  const { data: timingStats } = trpc.kitchen.getTimingStats.useQuery(
    { locationId: DEMO_LOCATION_ID },
    { enabled: status === "authenticated", refetchInterval: 10000 }
  );

  // Mutations
  const bumpTicketMutation = trpc.kitchen.bumpTicket.useMutation();
  const recallTicketMutation = trpc.kitchen.recallTicket.useMutation();
  const bumpItemMutation = trpc.order.bumpItem.useMutation();

  // Update local tickets when data changes
  useEffect(() => {
    if (ticketsData) {
      setTickets(
        ticketsData.map((t: typeof ticketsData[number]) => ({
          ...t,
          firedAt: t.firedAt ? new Date(t.firedAt) : null,
        }))
      );
    }
  }, [ticketsData, setTickets]);

  if (status === "loading" || isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background theme-kds">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    redirect("/login");
  }

  const handleBumpTicket = async (orderId: string) => {
    try {
      await bumpTicketMutation.mutateAsync({
        orderId,
        stationId: activeStationId || undefined,
      });
      refetch();
      toast({
        title: "Ticket bumped",
        description: "Items marked as ready",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to bump ticket",
        variant: "destructive",
      });
    }
  };

  const handleRecallTicket = async (orderId: string) => {
    try {
      await recallTicketMutation.mutateAsync({ orderId });
      refetch();
      toast({
        title: "Ticket recalled",
        description: "Items moved back to in progress",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to recall ticket",
        variant: "destructive",
      });
    }
  };

  const handleBumpItem = async (itemId: string) => {
    try {
      await bumpItemMutation.mutateAsync({ orderItemId: itemId });
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to bump item",
        variant: "destructive",
      });
    }
  };

  const stations =
    stationSummary?.map((s) => ({
      id: s.station.id,
      name: s.station.name,
      shortName: s.station.shortName,
      color: s.station.color,
      pendingCount: s.pendingCount,
    })) || [];

  const displayTickets = activeStationId ? getFilteredTickets() : tickets;

  return (
    <div className="h-screen flex flex-col bg-background theme-kds">
      {/* Header */}
      <header className="bg-card border-b px-4 py-2 flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary">Kitchen Display</h1>

        {/* Stats */}
        {timingStats && (
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Avg Time:</span>{" "}
              <span className="font-bold">{timingStats.avgTicketTime}m</span>
            </div>
            <div>
              <span className="text-muted-foreground">Active:</span>{" "}
              <span className="font-bold">{timingStats.activeTickets}</span>
            </div>
            {timingStats.lateTickets > 0 && (
              <div className="text-red-500">
                <span>Late:</span>{" "}
                <span className="font-bold">{timingStats.lateTickets}</span>
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleAudio}
            className="text-muted-foreground"
          >
            {audioEnabled ? (
              <Volume2 className="w-5 h-5" />
            ) : (
              <VolumeX className="w-5 h-5" />
            )}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => refetch()}>
            <RefreshCw className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Station Tabs */}
      <StationTabs stations={stations} />

      {/* Tickets Grid */}
      <div className="flex-1 overflow-auto p-4">
        {displayTickets.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-2xl font-bold">All Clear</p>
              <p className="text-lg">No pending tickets</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayTickets.map((ticket) => (
              <TicketCard
                key={ticket.orderId}
                ticket={ticket}
                onBump={handleBumpTicket}
                onRecall={handleRecallTicket}
                onBumpItem={handleBumpItem}
                showStationBadges={!activeStationId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
