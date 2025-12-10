"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Clock,
  Star,
  Repeat,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useQuickActionsStore } from "@/lib/stores";

interface QuickActionsBarProps {
  onItemClick: (item: {
    id: string;
    menuItemId: string;
    name: string;
    price: number;
    hasModifiers: boolean;
  }) => void;
  onRepeatLast?: () => void;
}

type TabType = "recent" | "favorites";

export function QuickActionsBar({
  onItemClick,
  onRepeatLast,
}: QuickActionsBarProps) {
  const [activeTab, setActiveTab] = useState<TabType>("recent");
  const { recentItems, favoriteItems, lastOrderItems, toggleFavorite } =
    useQuickActionsStore();

  const displayItems = activeTab === "recent" ? recentItems : favoriteItems;
  const hasLastOrder = lastOrderItems.length > 0;

  // Don't render if nothing to show
  if (recentItems.length === 0 && favoriteItems.length === 0 && !hasLastOrder) {
    return null;
  }

  return (
    <div className="bg-white border-b px-4 py-2">
      <div className="flex items-center gap-3">
        {/* Tab buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant={activeTab === "recent" ? "default" : "ghost"}
            size="sm"
            className="h-8 px-2 touch-manipulation no-tap-highlight"
            onClick={() => setActiveTab("recent")}
          >
            <Clock className="w-4 h-4 mr-1" />
            Recent
            {recentItems.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1">
                {recentItems.length}
              </Badge>
            )}
          </Button>
          <Button
            variant={activeTab === "favorites" ? "default" : "ghost"}
            size="sm"
            className="h-8 px-2 touch-manipulation no-tap-highlight"
            onClick={() => setActiveTab("favorites")}
          >
            <Star className="w-4 h-4 mr-1" />
            Favorites
            {favoriteItems.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1">
                {favoriteItems.length}
              </Badge>
            )}
          </Button>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-200 shrink-0" />

        {/* Scrollable items */}
        <ScrollArea className="flex-1">
          <div className="flex items-center gap-2 pb-2">
            {displayItems.length === 0 ? (
              <span className="text-sm text-muted-foreground px-2">
                {activeTab === "recent"
                  ? "No recent items yet"
                  : "Tap and hold an item to add to favorites"}
              </span>
            ) : (
              displayItems.map((item) => (
                <QuickActionItem
                  key={item.id}
                  item={item}
                  onClick={() =>
                    onItemClick({
                      id: item.id,
                      menuItemId: item.menuItemId,
                      name: item.name,
                      price: item.price,
                      hasModifiers: item.hasModifiers,
                    })
                  }
                  onToggleFavorite={() =>
                    toggleFavorite({
                      id: item.id,
                      menuItemId: item.menuItemId,
                      name: item.name,
                      price: item.price,
                      categoryName: item.categoryName,
                      hasModifiers: item.hasModifiers,
                    })
                  }
                  isFavorite={favoriteItems.some(
                    (f) => f.menuItemId === item.menuItemId
                  )}
                />
              ))
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Repeat Last button */}
        {hasLastOrder && onRepeatLast && (
          <>
            <div className="h-6 w-px bg-gray-200 shrink-0" />
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0 touch-manipulation no-tap-highlight"
              onClick={onRepeatLast}
            >
              <Repeat className="w-4 h-4 mr-1" />
              Repeat Last ({lastOrderItems.length})
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

interface QuickActionItemProps {
  item: {
    name: string;
    price: number;
    categoryName: string;
    hasModifiers: boolean;
  };
  onClick: () => void;
  onToggleFavorite: () => void;
  isFavorite: boolean;
}

function QuickActionItem({
  item,
  onClick,
  onToggleFavorite,
  isFavorite,
}: QuickActionItemProps) {
  const [showFavorite, setShowFavorite] = useState(false);

  return (
    <div className="relative group">
      <button
        className={cn(
          "flex flex-col items-start px-3 py-2 rounded-lg border bg-gray-50 hover:bg-gray-100",
          "min-w-[120px] max-w-[160px] touch-manipulation no-tap-highlight",
          "transition-colors active:bg-gray-200"
        )}
        onClick={onClick}
        onContextMenu={(e) => {
          e.preventDefault();
          onToggleFavorite();
        }}
        onTouchStart={() => {
          const timer = setTimeout(() => {
            setShowFavorite(true);
          }, 500);
          return () => clearTimeout(timer);
        }}
        onTouchEnd={() => setShowFavorite(false)}
      >
        <span className="text-sm font-medium truncate w-full text-left">
          {item.name}
        </span>
        <div className="flex items-center justify-between w-full mt-0.5">
          <span className="text-xs text-muted-foreground truncate">
            {item.categoryName}
          </span>
          <span className="text-xs font-semibold">
            {formatCurrency(item.price)}
          </span>
        </div>
        {item.hasModifiers && (
          <Badge
            variant="outline"
            className="absolute -top-1 -right-1 h-4 px-1 text-[10px]"
          >
            +mod
          </Badge>
        )}
      </button>

      {/* Favorite indicator */}
      {isFavorite && (
        <Star className="absolute -top-1 -left-1 w-4 h-4 text-yellow-500 fill-yellow-500" />
      )}

      {/* Long-press favorite action (shows on touch hold) */}
      {showFavorite && (
        <div
          className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
            setShowFavorite(false);
          }}
        >
          <Star
            className={cn(
              "w-6 h-6",
              isFavorite ? "text-yellow-500 fill-yellow-500" : "text-white"
            )}
          />
        </div>
      )}
    </div>
  );
}
