"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WifiOff, Wifi, RefreshCw, CloudOff, Cloud } from "lucide-react";
import { useSyncStore, syncPendingActions } from "@/lib/offline/sync-service";

interface OfflineIndicatorProps {
  className?: string;
  showPendingCount?: boolean;
  showSyncButton?: boolean;
}

export function OfflineIndicator({
  className,
  showPendingCount = true,
  showSyncButton = true,
}: OfflineIndicatorProps) {
  const { isOnline, isSyncing, pendingCount, lastSyncAt, syncError, refreshPendingCount } =
    useSyncStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    refreshPendingCount();
  }, [refreshPendingCount]);

  // Don't render on server
  if (!mounted) return null;

  // When online with no pending actions, show minimal indicator
  if (isOnline && pendingCount === 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "flex items-center gap-1 text-green-600",
                className
              )}
            >
              <Cloud className="w-4 h-4" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Connected - all changes synced</p>
            {lastSyncAt && (
              <p className="text-xs text-muted-foreground">
                Last sync: {new Date(lastSyncAt).toLocaleTimeString()}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const handleSync = async () => {
    if (!isOnline || isSyncing) return;
    await syncPendingActions();
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-2",
              className
            )}
          >
            {/* Online/Offline indicator */}
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-600" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}

            {/* Pending count badge */}
            {showPendingCount && pendingCount > 0 && (
              <Badge
                variant={isOnline ? "secondary" : "destructive"}
                className="h-5 min-w-5 px-1.5 text-xs"
              >
                {pendingCount}
              </Badge>
            )}

            {/* Sync button */}
            {showSyncButton && pendingCount > 0 && isOnline && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handleSync}
                disabled={isSyncing}
              >
                <RefreshCw
                  className={cn("w-3.5 h-3.5", isSyncing && "animate-spin")}
                />
              </Button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">
              {isOnline ? "Connected" : "Offline"}
            </p>
            {pendingCount > 0 && (
              <p className="text-sm">
                {pendingCount} pending action{pendingCount !== 1 && "s"}
              </p>
            )}
            {syncError && (
              <p className="text-sm text-red-500">{syncError}</p>
            )}
            {!isOnline && (
              <p className="text-xs text-muted-foreground">
                Changes will sync when you reconnect
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Floating offline banner that shows when offline
export function OfflineBanner() {
  const { isOnline, pendingCount } = useSyncStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isOnline) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-red-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
        <CloudOff className="w-4 h-4" />
        <span className="text-sm font-medium">
          Offline Mode
          {pendingCount > 0 && ` - ${pendingCount} pending`}
        </span>
      </div>
    </div>
  );
}
