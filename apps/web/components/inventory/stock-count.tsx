"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ClipboardCheck,
  Save,
  AlertTriangle,
  CheckCircle,
  Search,
  Package,
  Plus,
  Minus,
} from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  parLevel: number;
  storageLocation: string | null;
}

interface CountEntry {
  itemId: string;
  previousCount: number;
  newCount: number;
  variance: number;
  notes: string;
}

interface StockCountProps {
  items: InventoryItem[];
  onSubmitCount: (counts: CountEntry[]) => Promise<void>;
  isSubmitting?: boolean;
}

export function StockCount({ items, onSubmitCount, isSubmitting }: StockCountProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [counts, setCounts] = useState<Map<string, CountEntry>>(new Map());
  const [activeItem, setActiveItem] = useState<InventoryItem | null>(null);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [currentNote, setCurrentNote] = useState("");

  // Filter items by search
  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by category
  const itemsByCategory = filteredItems.reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, InventoryItem[]>
  );

  // Stats
  const countedItems = counts.size;
  const totalItems = items.length;
  const varianceItems = Array.from(counts.values()).filter(
    (c) => c.variance !== 0
  ).length;

  const handleCountChange = (item: InventoryItem, newCount: number) => {
    const entry: CountEntry = {
      itemId: item.id,
      previousCount: item.currentStock,
      newCount: Math.max(0, newCount),
      variance: Math.max(0, newCount) - item.currentStock,
      notes: counts.get(item.id)?.notes || "",
    };
    setCounts(new Map(counts.set(item.id, entry)));
  };

  const handleQuickAdjust = (item: InventoryItem, delta: number) => {
    const current = counts.get(item.id)?.newCount ?? item.currentStock;
    handleCountChange(item, current + delta);
  };

  const handleAddNote = (item: InventoryItem) => {
    setActiveItem(item);
    setCurrentNote(counts.get(item.id)?.notes || "");
    setNoteDialogOpen(true);
  };

  const handleSaveNote = () => {
    if (!activeItem) return;
    const existing = counts.get(activeItem.id);
    if (existing) {
      setCounts(
        new Map(counts.set(activeItem.id, { ...existing, notes: currentNote }))
      );
    }
    setNoteDialogOpen(false);
    setActiveItem(null);
  };

  const handleSubmit = async () => {
    const countEntries = Array.from(counts.values());
    if (countEntries.length === 0) return;
    await onSubmitCount(countEntries);
    setCounts(new Map());
  };

  const getVarianceBadge = (variance: number) => {
    if (variance === 0) return null;
    if (variance > 0) {
      return (
        <Badge variant="success" className="ml-2">
          +{variance}
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="ml-2">
        {variance}
      </Badge>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5" />
              Stock Count
            </h2>
            <p className="text-sm text-muted-foreground">
              Update inventory counts for all items
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Progress</p>
              <p className="font-bold">
                {countedItems} / {totalItems} items
              </p>
            </div>
            {varianceItems > 0 && (
              <Badge variant="warning" className="text-sm">
                <AlertTriangle className="w-4 h-4 mr-1" />
                {varianceItems} variances
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items..."
              className="pl-10"
            />
          </div>

          <Button
            variant="pos-success"
            onClick={handleSubmit}
            disabled={isSubmitting || counts.size === 0}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Count ({counts.size} items)
          </Button>
        </div>
      </div>

      {/* Items Grid */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {Object.entries(itemsByCategory).map(([category, categoryItems]) => (
            <div key={category}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                {category}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {categoryItems.map((item) => {
                  const countEntry = counts.get(item.id);
                  const currentCount = countEntry?.newCount ?? item.currentStock;
                  const variance = countEntry?.variance ?? 0;
                  const hasNote = countEntry?.notes && countEntry.notes.length > 0;

                  return (
                    <Card
                      key={item.id}
                      className={cn(
                        "transition-colors",
                        countEntry && "border-primary bg-primary/5"
                      )}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">{item.name}</CardTitle>
                            <CardDescription>
                              {item.storageLocation || item.category}
                            </CardDescription>
                          </div>
                          {countEntry && (
                            <CheckCircle className="w-5 h-5 text-primary" />
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10"
                            onClick={() => handleQuickAdjust(item, -1)}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>

                          <div className="flex-1">
                            <Input
                              type="number"
                              min="0"
                              value={currentCount}
                              onChange={(e) =>
                                handleCountChange(
                                  item,
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="text-center text-lg font-mono h-10"
                            />
                          </div>

                          <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10"
                            onClick={() => handleQuickAdjust(item, 1)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="flex items-center justify-between mt-2 text-sm">
                          <span className="text-muted-foreground">
                            Previous: {item.currentStock} {item.unit}
                          </span>
                          {getVarianceBadge(variance)}
                        </div>
                      </CardContent>
                      <CardFooter className="pt-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => handleAddNote(item)}
                        >
                          {hasNote ? "Edit Note" : "Add Note"}
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Count Note - {activeItem?.name}</DialogTitle>
          </DialogHeader>
          <div>
            <Input
              value={currentNote}
              onChange={(e) => setCurrentNote(e.target.value)}
              placeholder="Add notes about this count (e.g., 'Found damaged items')"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNote}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
