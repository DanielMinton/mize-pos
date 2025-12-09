"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { formatCurrencyShort } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { usePOSStore, useOrderStore } from "@/lib/stores";

interface BaseMenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number | string;
  isEightySixed: boolean;
  stockCount: number | null;
  color: string | null;
  tags: string[];
  modifierGroups: Array<{
    modifierGroup: {
      id: string;
      name: string;
      displayName: string | null;
      required: boolean;
      multiSelect: boolean;
      minSelections: number;
      maxSelections: number | null;
      modifiers: Array<{
        id: string;
        name: string;
        shortName: string | null;
        priceAdjustment: number | string;
        isDefault: boolean;
        isActive: boolean;
      }>;
    };
    required: boolean | null;
    minSelections: number | null;
    maxSelections: number | null;
  }>;
}

interface MenuCategory<T extends BaseMenuItem = BaseMenuItem> {
  id: string;
  name: string;
  color: string | null;
  items: T[];
}

interface MenuGridProps<T extends BaseMenuItem = BaseMenuItem> {
  categories: MenuCategory<T>[];
  onItemClick: (item: T) => void;
}

export function MenuGrid<T extends BaseMenuItem>({ categories, onItemClick }: MenuGridProps<T>) {
  const { activeCategoryId, searchQuery, isItemEightySixed } = usePOSStore();

  // Filter items based on active category and search
  const displayItems = useMemo(() => {
    let items: T[] = [];

    if (activeCategoryId) {
      const category = categories.find((c) => c.id === activeCategoryId);
      items = category?.items || [];
    } else {
      // Show all items from all categories
      items = categories.flatMap((c) => c.items);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    return items;
  }, [categories, activeCategoryId, searchQuery]);

  if (displayItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        {searchQuery ? "No items match your search" : "No items in this category"}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 p-2">
      {displayItems.map((item) => (
        <MenuItemButton
          key={item.id}
          item={item}
          isEightySixed={item.isEightySixed || isItemEightySixed(item.id)}
          onClick={() => onItemClick(item)}
        />
      ))}
    </div>
  );
}

interface MenuItemButtonProps {
  item: BaseMenuItem;
  isEightySixed: boolean;
  onClick: () => void;
}

function MenuItemButton({ item, isEightySixed, onClick }: MenuItemButtonProps) {
  const price = typeof item.price === "string" ? parseFloat(item.price) : item.price;

  return (
    <button
      onClick={onClick}
      disabled={isEightySixed}
      className={cn(
        "relative flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all",
        "min-h-[100px] text-center no-select touch-target",
        "hover:shadow-md active:scale-95",
        isEightySixed
          ? "bg-gray-100 border-gray-300 opacity-60 cursor-not-allowed"
          : "bg-white border-gray-200 hover:border-primary/50",
        item.color && !isEightySixed && `border-l-4`,
      )}
      style={item.color && !isEightySixed ? { borderLeftColor: item.color } : undefined}
    >
      {isEightySixed && (
        <Badge variant="eighty-six" className="absolute top-1 right-1 text-[10px]">
          86
        </Badge>
      )}

      {item.stockCount !== null && item.stockCount <= 5 && !isEightySixed && (
        <Badge
          variant="outline"
          className="absolute top-1 right-1 text-[10px] border-yellow-500 text-yellow-700"
        >
          {item.stockCount} left
        </Badge>
      )}

      <span
        className={cn(
          "font-semibold text-sm leading-tight",
          isEightySixed && "line-through text-gray-500"
        )}
      >
        {item.name}
      </span>

      <span className="text-lg font-bold text-primary mt-1">
        {formatCurrencyShort(price)}
      </span>

      {item.tags.includes("spicy") && (
        <span className="text-xs mt-0.5">🌶️</span>
      )}
    </button>
  );
}
