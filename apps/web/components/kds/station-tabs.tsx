"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useKitchenStore } from "@/lib/stores";

interface Station {
  id: string;
  name: string;
  shortName: string;
  color: string | null;
  pendingCount: number;
}

interface StationTabsProps {
  stations: Station[];
}

export function StationTabs({ stations }: StationTabsProps) {
  const { activeStationId, setActiveStation, viewMode, setViewMode } =
    useKitchenStore();

  return (
    <div className="flex items-center gap-2 p-2 bg-secondary/30 overflow-x-auto">
      {/* View mode toggle */}
      <div className="flex rounded-lg overflow-hidden border mr-4">
        <button
          onClick={() => setViewMode("tickets")}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors",
            viewMode === "tickets"
              ? "bg-primary text-primary-foreground"
              : "bg-background hover:bg-muted"
          )}
        >
          Tickets
        </button>
        <button
          onClick={() => setViewMode("expo")}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors",
            viewMode === "expo"
              ? "bg-primary text-primary-foreground"
              : "bg-background hover:bg-muted"
          )}
        >
          Expo
        </button>
      </div>

      {/* All stations */}
      <button
        onClick={() => setActiveStation(null)}
        className={cn(
          "px-4 py-3 rounded-lg font-semibold text-sm transition-colors whitespace-nowrap",
          "min-h-touch touch-target flex items-center gap-2",
          activeStationId === null
            ? "bg-primary text-primary-foreground shadow"
            : "bg-card hover:bg-muted border"
        )}
      >
        ALL
        <Badge variant="secondary" className="text-xs">
          {stations.reduce((sum: number, s: typeof stations[number]) => sum + s.pendingCount, 0)}
        </Badge>
      </button>

      {/* Individual stations */}
      {stations.map((station: typeof stations[number]) => (
        <button
          key={station.id}
          onClick={() => setActiveStation(station.id)}
          className={cn(
            "px-4 py-3 rounded-lg font-semibold text-sm transition-colors whitespace-nowrap",
            "min-h-touch touch-target flex items-center gap-2",
            activeStationId === station.id
              ? "shadow text-white"
              : "bg-card hover:bg-muted border"
          )}
          style={
            activeStationId === station.id && station.color
              ? { backgroundColor: station.color }
              : undefined
          }
        >
          {station.name}
          {station.pendingCount > 0 && (
            <Badge
              variant={activeStationId === station.id ? "secondary" : "default"}
              className="text-xs"
            >
              {station.pendingCount}
            </Badge>
          )}
        </button>
      ))}
    </div>
  );
}
