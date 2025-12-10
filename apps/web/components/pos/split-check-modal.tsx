"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Users,
  Split,
  User,
  Check,
  Plus,
  Minus,
  ArrowRight,
} from "lucide-react";

type SplitMode = "even" | "by-seat" | "custom";

interface OrderItem {
  id: string;
  quantity: number;
  seat: number;
  menuItem: { name: string };
  totalPrice: number | string | { toString(): string };
  modifiers: Array<{ name: string }>;
}

interface SplitCheckModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    id: string;
    orderNumber?: number;
    guestCount: number;
    items: OrderItem[];
    subtotal: number;
    tax: number;
    total: number;
  } | null;
  onSplitEvenly: (numWays: number) => Promise<void>;
  onSplitBySeat: () => Promise<void>;
  onSplitCustom: (splits: Array<{ name: string; itemIds: string[] }>) => Promise<void>;
}

interface CheckSplit {
  id: string;
  name: string;
  itemIds: Set<string>;
}

export function SplitCheckModal({
  open,
  onOpenChange,
  order,
  onSplitEvenly,
  onSplitBySeat,
  onSplitCustom,
}: SplitCheckModalProps) {
  const [mode, setMode] = useState<SplitMode>("even");
  const [numWays, setNumWays] = useState(2);
  const [customSplits, setCustomSplits] = useState<CheckSplit[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize custom splits
  useEffect(() => {
    if (open && order) {
      setNumWays(Math.min(order.guestCount, 2));
      // Initialize with 2 empty checks
      setCustomSplits([
        { id: "1", name: "Check 1", itemIds: new Set() },
        { id: "2", name: "Check 2", itemIds: new Set() },
      ]);
    }
  }, [open, order]);

  if (!order) return null;

  const taxRate = order.tax / order.subtotal || 0.0825;

  // Get unique seats
  const uniqueSeats = [...new Set(order.items.map((i) => i.seat))].sort();

  // Calculate split totals
  const calculateSplitTotal = (itemIds: Set<string>) => {
    const subtotal = order.items
      .filter((item) => itemIds.has(item.id))
      .reduce((sum, item) => sum + Number(item.totalPrice), 0);
    const tax = subtotal * taxRate;
    return { subtotal, tax, total: subtotal + tax };
  };

  // Get unassigned items
  const assignedItemIds = new Set(
    customSplits.flatMap((s) => Array.from(s.itemIds))
  );
  const unassignedItems = order.items.filter(
    (item) => !assignedItemIds.has(item.id)
  );

  const handleAddCheck = () => {
    const newId = (customSplits.length + 1).toString();
    setCustomSplits([
      ...customSplits,
      { id: newId, name: `Check ${newId}`, itemIds: new Set() },
    ]);
  };

  const handleRemoveCheck = (checkId: string) => {
    if (customSplits.length <= 2) return;
    setCustomSplits(customSplits.filter((s) => s.id !== checkId));
  };

  const handleAssignItem = (itemId: string, checkId: string) => {
    setCustomSplits(
      customSplits.map((split) => {
        const newItemIds = new Set(split.itemIds);
        if (split.id === checkId) {
          newItemIds.add(itemId);
        } else {
          newItemIds.delete(itemId);
        }
        return { ...split, itemIds: newItemIds };
      })
    );
  };

  const handleUnassignItem = (itemId: string) => {
    setCustomSplits(
      customSplits.map((split) => {
        const newItemIds = new Set(split.itemIds);
        newItemIds.delete(itemId);
        return { ...split, itemIds: newItemIds };
      })
    );
  };

  const handleSplit = async () => {
    setIsProcessing(true);
    try {
      if (mode === "even") {
        await onSplitEvenly(numWays);
      } else if (mode === "by-seat") {
        await onSplitBySeat();
      } else {
        // Custom split
        const validSplits = customSplits
          .filter((s) => s.itemIds.size > 0)
          .map((s) => ({
            name: s.name,
            itemIds: Array.from(s.itemIds),
          }));
        if (validSplits.length < 2) {
          alert("Please assign items to at least 2 checks");
          return;
        }
        await onSplitCustom(validSplits);
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Split failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderEvenSplit = () => {
    const perPerson = order.total / numWays;

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">Split evenly between</p>
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12"
              onClick={() => setNumWays(Math.max(2, numWays - 1))}
              disabled={numWays <= 2}
            >
              <Minus className="w-5 h-5" />
            </Button>
            <span className="text-4xl font-bold w-16 text-center">{numWays}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12"
              onClick={() => setNumWays(Math.min(20, numWays + 1))}
              disabled={numWays >= 20}
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">people</p>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: Math.min(numWays, 6) }).map((_, i) => (
            <div
              key={i}
              className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-center"
            >
              <User className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Person {i + 1}</p>
              <p className="text-lg font-bold">{formatCurrency(perPerson)}</p>
            </div>
          ))}
          {numWays > 6 && (
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-center col-span-2">
              <p className="text-muted-foreground">
                +{numWays - 6} more ({formatCurrency(perPerson)} each)
              </p>
            </div>
          )}
        </div>

        <div className="p-4 bg-primary/10 rounded-lg">
          <div className="flex justify-between text-sm">
            <span>Total</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
          <div className="flex justify-between font-bold mt-1">
            <span>Per Person</span>
            <span>{formatCurrency(perPerson)}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderBySeat = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground text-center">
        Split check by seat assignment
      </p>

      <div className="space-y-3">
        {uniqueSeats.map((seat) => {
          const seatItems = order.items.filter((i) => i.seat === seat);
          const subtotal = seatItems.reduce(
            (sum, item) => sum + Number(item.totalPrice),
            0
          );
          const tax = subtotal * taxRate;
          const total = subtotal + tax;

          return (
            <div
              key={seat}
              className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline">Seat {seat}</Badge>
                <span className="font-bold">{formatCurrency(total)}</span>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                {seatItems.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span>
                      {item.quantity > 1 && `${item.quantity}x `}
                      {item.menuItem.name}
                    </span>
                    <span>{formatCurrency(Number(item.totalPrice))}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {uniqueSeats.length < 2 && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg text-center text-sm">
          <p className="text-yellow-700 dark:text-yellow-300">
            All items are assigned to the same seat. Use Even Split or Custom
            Split instead.
          </p>
        </div>
      )}
    </div>
  );

  const renderCustomSplit = () => (
    <div className="space-y-4">
      {/* Unassigned items */}
      {unassignedItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Unassigned Items</p>
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-2">
            {unassignedItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {item.quantity > 1 && `${item.quantity}x `}
                    {item.menuItem.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(Number(item.totalPrice))}
                  </p>
                </div>
                <div className="flex gap-1 ml-2">
                  {customSplits.map((split) => (
                    <Button
                      key={split.id}
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={() => handleAssignItem(item.id, split.id)}
                    >
                      <ArrowRight className="w-3 h-3 mr-1" />
                      {split.name}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Check splits */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Checks</p>
          <Button variant="outline" size="sm" onClick={handleAddCheck}>
            <Plus className="w-4 h-4 mr-1" />
            Add Check
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {customSplits.map((split) => {
            const { subtotal, tax, total } = calculateSplitTotal(split.itemIds);
            const splitItems = order.items.filter((i) =>
              split.itemIds.has(i.id)
            );

            return (
              <div
                key={split.id}
                className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <Input
                    value={split.name}
                    onChange={(e) =>
                      setCustomSplits(
                        customSplits.map((s) =>
                          s.id === split.id
                            ? { ...s, name: e.target.value }
                            : s
                        )
                      )
                    }
                    className="h-7 text-sm font-medium"
                  />
                  {customSplits.length > 2 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 ml-1"
                      onClick={() => handleRemoveCheck(split.id)}
                    >
                      ×
                    </Button>
                  )}
                </div>

                <ScrollArea className="h-24">
                  {splitItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No items
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {splitItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-xs p-1 bg-white dark:bg-gray-800 rounded"
                        >
                          <span className="truncate flex-1">
                            {item.menuItem.name}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 ml-1"
                            onClick={() => handleUnassignItem(item.id)}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                <Separator className="my-2" />
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    Subtotal: {formatCurrency(subtotal)}
                  </p>
                  <p className="text-sm font-bold">{formatCurrency(total)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {unassignedItems.length > 0 && (
        <p className="text-sm text-yellow-600 text-center">
          {unassignedItems.length} item(s) still need to be assigned
        </p>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Split className="w-5 h-5" />
            Split Check
            {order.orderNumber && (
              <Badge variant="outline" className="ml-2">
                #{order.orderNumber}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as SplitMode)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="even" className="gap-1">
              <Users className="w-4 h-4" />
              Even
            </TabsTrigger>
            <TabsTrigger value="by-seat" className="gap-1">
              <User className="w-4 h-4" />
              By Seat
            </TabsTrigger>
            <TabsTrigger value="custom" className="gap-1">
              <Split className="w-4 h-4" />
              Custom
            </TabsTrigger>
          </TabsList>

          <TabsContent value="even" className="mt-4">
            {renderEvenSplit()}
          </TabsContent>

          <TabsContent value="by-seat" className="mt-4">
            {renderBySeat()}
          </TabsContent>

          <TabsContent value="custom" className="mt-4">
            {renderCustomSplit()}
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="pos-primary"
            className="flex-1"
            onClick={handleSplit}
            disabled={
              isProcessing ||
              (mode === "by-seat" && uniqueSeats.length < 2) ||
              (mode === "custom" && unassignedItems.length > 0)
            }
          >
            {isProcessing ? (
              "Splitting..."
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Split Check
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
