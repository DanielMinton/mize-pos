"use client";

import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { usePOSStore } from "@/lib/stores";

interface Category {
  id: string;
  name: string;
  color: string | null;
  itemCount: number;
}

interface CategoryTabsProps {
  categories: Category[];
}

export function CategoryTabs({ categories }: CategoryTabsProps) {
  const { activeCategoryId, setActiveCategory } = usePOSStore();

  return (
    <ScrollArea className="w-full border-b bg-muted/30">
      <div className="flex p-2 gap-2">
        <button
          onClick={() => setActiveCategory(null)}
          className={cn(
            "px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap",
            "min-h-touch touch-target",
            activeCategoryId === null
              ? "bg-primary text-primary-foreground shadow"
              : "bg-white hover:bg-gray-100 border"
          )}
        >
          All Items
        </button>

        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={cn(
              "px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap",
              "min-h-touch touch-target flex items-center gap-2",
              activeCategoryId === category.id
                ? "bg-primary text-primary-foreground shadow"
                : "bg-white hover:bg-gray-100 border"
            )}
            style={
              activeCategoryId === category.id && category.color
                ? { backgroundColor: category.color }
                : undefined
            }
          >
            {category.name}
            <span className="text-xs opacity-70">({category.itemCount})</span>
          </button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
