"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatOrderNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ChevronRight,
  Flame,
  Hand,
  Trash2,
  Users,
  X,
  CreditCard,
  Split,
} from "lucide-react";
import { useOrderStore } from "@/lib/stores";

interface OrderSidebarProps {
  onFireOrder: () => void;
  onHoldItems: (itemIds: string[]) => void;
  onRemoveItem: (itemId: string) => void;
  onCloseOrder: () => void;
  onPayment: () => void;
  onSplitCheck: () => void;
  isSubmitting?: boolean;
}

export function OrderSidebar({
  onFireOrder,
  onHoldItems,
  onRemoveItem,
  onCloseOrder,
  onPayment,
  onSplitCheck,
  isSubmitting,
}: OrderSidebarProps) {
  const { currentOrder, getSubtotal, getItemCount } = useOrderStore();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  if (!currentOrder) {
    return (
      <div className="w-80 bg-white border-l flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
        <p className="text-lg font-medium">No Active Order</p>
        <p className="text-sm mt-2">
          Select a table or start a new tab to begin
        </p>
      </div>
    );
  }

  const subtotal = getSubtotal();
  const taxRate = 0.0825;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  const itemCount = getItemCount();

  const pendingItems = currentOrder.items.filter((i) => i.status === "PENDING");
  const sentItems = currentOrder.items.filter(
    (i) => i.status !== "PENDING" && i.status !== "VOID"
  );

  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  return (
    <div className="w-80 bg-white border-l flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg">
              {currentOrder.orderNumber
                ? formatOrderNumber(currentOrder.orderNumber)
                : "New Order"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {currentOrder.tableName || currentOrder.tabName || "Order"}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{currentOrder.guestCount}</span>
          </div>
        </div>
      </div>

      {/* Items */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Pending Items (not sent yet) */}
          {pendingItems.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="pending" className="text-xs">
                  Not Sent
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {pendingItems.length} item{pendingItems.length !== 1 && "s"}
                </span>
              </div>
              <div className="space-y-2">
                {pendingItems.map((item) => (
                  <OrderItemRow
                    key={item.id}
                    item={item}
                    isSelected={selectedItems.has(item.id)}
                    onSelect={() => toggleItemSelection(item.id)}
                    onRemove={() => onRemoveItem(item.id)}
                    canRemove
                  />
                ))}
              </div>
            </div>
          )}

          {/* Sent Items */}
          {sentItems.length > 0 && (
            <div>
              {pendingItems.length > 0 && <Separator className="my-4" />}
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="fired" className="text-xs">
                  Sent
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {sentItems.length} item{sentItems.length !== 1 && "s"}
                </span>
              </div>
              <div className="space-y-2">
                {sentItems.map((item) => (
                  <OrderItemRow
                    key={item.id}
                    item={item}
                    isSelected={selectedItems.has(item.id)}
                    onSelect={() => toggleItemSelection(item.id)}
                    canRemove={false}
                  />
                ))}
              </div>
            </div>
          )}

          {currentOrder.items.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <p>No items yet</p>
              <p className="text-sm">Tap items from the menu to add them</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Totals */}
      <div className="border-t p-4 space-y-2 bg-gray-50">
        <div className="flex justify-between text-sm">
          <span>Subtotal ({itemCount} items)</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Tax (8.25%)</span>
          <span>{formatCurrency(tax)}</span>
        </div>
        <Separator />
        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t space-y-2">
        {/* Fire/Hold row */}
        <div className="flex gap-2">
          <Button
            variant="pos-primary"
            size="pos"
            className="flex-1"
            onClick={onFireOrder}
            disabled={pendingItems.length === 0 || isSubmitting}
          >
            <Flame className="w-5 h-5 mr-2" />
            Fire
          </Button>
          <Button
            variant="pos-warning"
            size="pos"
            className="flex-1"
            onClick={() =>
              onHoldItems(
                selectedItems.size > 0
                  ? Array.from(selectedItems)
                  : pendingItems.map((i) => i.id)
              )
            }
            disabled={pendingItems.length === 0 || isSubmitting}
          >
            <Hand className="w-5 h-5 mr-2" />
            Hold
          </Button>
        </div>

        {/* Payment row */}
        <div className="flex gap-2">
          <Button
            variant="pos-success"
            size="pos"
            className="flex-1"
            onClick={onPayment}
            disabled={currentOrder.items.length === 0 || isSubmitting}
          >
            <CreditCard className="w-5 h-5 mr-2" />
            Pay
          </Button>
          <Button
            variant="pos"
            size="pos"
            onClick={onSplitCheck}
            disabled={currentOrder.items.length < 2 || isSubmitting}
          >
            <Split className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface OrderItemRowProps {
  item: {
    id: string;
    quantity: number;
    seat: number;
    status: string;
    totalPrice: number | string | { toString(): string };
    specialInstructions: string | null;
    menuItem: { name: string };
    modifiers: Array<{ name: string; priceAdjustment: number | string | { toString(): string } }>;
  };
  isSelected: boolean;
  onSelect: () => void;
  onRemove?: () => void;
  canRemove: boolean;
}

function OrderItemRow({
  item,
  isSelected,
  onSelect,
  onRemove,
  canRemove,
}: OrderItemRowProps) {
  const price =
    typeof item.totalPrice === "number"
      ? item.totalPrice
      : parseFloat(item.totalPrice.toString());

  return (
    <div
      className={cn(
        "p-2 rounded-lg border transition-colors",
        isSelected ? "border-primary bg-primary/5" : "border-gray-200",
        item.status === "VOID" && "opacity-50"
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {item.quantity > 1 && (
                <span className="text-primary mr-1">{item.quantity}x</span>
              )}
              {item.menuItem.name}
            </span>
            {item.seat > 1 && (
              <Badge variant="outline" className="text-xs">
                S{item.seat}
              </Badge>
            )}
          </div>

          {item.modifiers.length > 0 && (
            <div className="text-xs text-muted-foreground mt-0.5">
              {item.modifiers.map((m) => m.name).join(", ")}
            </div>
          )}

          {item.specialInstructions && (
            <div className="text-xs text-orange-600 mt-0.5 italic">
              {item.specialInstructions}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{formatCurrency(price)}</span>
          {canRemove && onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="p-1 text-red-500 hover:bg-red-50 rounded"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
