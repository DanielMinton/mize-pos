"use client";

import { cn } from "@/lib/utils";
import { formatOrderNumber, formatTicketAge } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Undo } from "lucide-react";

interface TicketItem {
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
}

interface Ticket {
  orderId: string;
  orderNumber: number;
  tableName: string;
  serverName: string;
  guestCount: number;
  firedAt: Date | null;
  ageMinutes: number;
  ticketStatus: "new" | "cooking" | "ready" | "late";
  items: TicketItem[];
}

interface TicketCardProps {
  ticket: Ticket;
  onBump: (orderId: string) => void;
  onRecall?: (orderId: string) => void;
  onBumpItem?: (itemId: string) => void;
  showStationBadges?: boolean;
}

export function TicketCard({
  ticket,
  onBump,
  onRecall,
  onBumpItem,
  showStationBadges = true,
}: TicketCardProps) {
  const statusColors = {
    new: "ticket-new",
    cooking: "ticket-cooking",
    ready: "ticket-ready",
    late: "ticket-late",
  };

  const isAllReady = ticket.items.every((item) => item.status === "READY");

  return (
    <div
      className={cn(
        "bg-card rounded-lg shadow-lg overflow-hidden",
        statusColors[ticket.ticketStatus]
      )}
    >
      {/* Header */}
      <div className="bg-secondary/50 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">
              {formatOrderNumber(ticket.orderNumber)}
            </span>
            <span className="text-muted-foreground">{ticket.tableName}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {ticket.serverName} • {ticket.guestCount} guests
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={
              ticket.ticketStatus === "late"
                ? "late"
                : ticket.ticketStatus === "ready"
                  ? "ready"
                  : ticket.ticketStatus === "cooking"
                    ? "cooking"
                    : "new"
            }
            className="text-base px-3 py-1"
          >
            {formatTicketAge(ticket.ageMinutes)}
          </Badge>
        </div>
      </div>

      {/* Items */}
      <div className="p-4 space-y-3">
        {/* Group items by course */}
        {Array.from(new Set(ticket.items.map((i: typeof ticket.items[number]) => i.course)))
          .sort()
          .map((course: number) => {
            const courseItems = ticket.items.filter((i: typeof ticket.items[number]) => i.course === course);
            return (
              <div key={course}>
                {ticket.items.some((i) => i.course !== 1) && (
                  <div className="text-xs text-muted-foreground font-semibold uppercase mb-2">
                    Course {course}
                  </div>
                )}
                <div className="space-y-2">
                  {courseItems.map((item: typeof courseItems[number]) => (
                    <TicketItemRow
                      key={item.id}
                      item={item}
                      showStation={showStationBadges}
                      onBump={onBumpItem ? () => onBumpItem(item.id) : undefined}
                    />
                  ))}
                </div>
              </div>
            );
          })}
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-2">
        {isAllReady ? (
          <>
            <Button
              variant="pos-success"
              size="pos"
              className="flex-1"
              onClick={() => onBump(ticket.orderId)}
            >
              <Check className="w-5 h-5 mr-2" />
              Complete
            </Button>
            {onRecall && (
              <Button
                variant="outline"
                size="pos"
                onClick={() => onRecall(ticket.orderId)}
              >
                <Undo className="w-5 h-5" />
              </Button>
            )}
          </>
        ) : (
          <Button
            variant="pos-primary"
            size="pos"
            className="flex-1"
            onClick={() => onBump(ticket.orderId)}
          >
            <Check className="w-5 h-5 mr-2" />
            Bump All
          </Button>
        )}
      </div>
    </div>
  );
}

interface TicketItemRowProps {
  item: TicketItem;
  showStation: boolean;
  onBump?: () => void;
}

function TicketItemRow({ item, showStation, onBump }: TicketItemRowProps) {
  const isReady = item.status === "READY";

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-2 rounded",
        isReady && "bg-green-100 dark:bg-green-900/30"
      )}
    >
      {/* Quantity */}
      <div className="w-8 h-8 flex items-center justify-center bg-primary text-primary-foreground font-bold rounded text-lg">
        {item.quantity}
      </div>

      {/* Item details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-bold text-lg",
              isReady && "line-through opacity-60"
            )}
          >
            {item.kitchenName}
          </span>

          {showStation && item.station && (
            <Badge
              className="text-xs"
              style={{ backgroundColor: item.station.color || "#6B7280" }}
            >
              {item.station.shortName}
            </Badge>
          )}

          {item.seat > 1 && (
            <Badge variant="outline" className="text-xs">
              S{item.seat}
            </Badge>
          )}
        </div>

        {/* Modifiers */}
        {item.modifiers.length > 0 && (
          <div className="text-base text-muted-foreground font-medium mt-1">
            {item.modifiers.join(" • ")}
          </div>
        )}

        {/* Special Instructions */}
        {item.specialInstructions && (
          <div className="text-base text-orange-500 font-semibold mt-1 uppercase">
            ⚠️ {item.specialInstructions}
          </div>
        )}
      </div>

      {/* Individual bump */}
      {onBump && !isReady && (
        <Button variant="ghost" size="icon" onClick={onBump}>
          <Check className="w-5 h-5" />
        </Button>
      )}

      {isReady && (
        <Badge variant="ready" className="text-sm">
          READY
        </Badge>
      )}
    </div>
  );
}
