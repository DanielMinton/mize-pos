"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatCurrencyShort } from "@/lib/utils";
import { useOrderStore } from "@/lib/stores";
import { Minus, Plus } from "lucide-react";

interface ModifierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ModifierModal({
  open,
  onOpenChange,
  onConfirm,
}: ModifierModalProps) {
  const {
    modifierSelection,
    setModifierSelection,
    setSpecialInstructions,
    setItemQuantity,
    setItemSeat,
    setItemCourse,
    closeModifierSelection,
  } = useOrderStore();

  if (!modifierSelection) return null;

  const { menuItem, selectedModifiers, specialInstructions, quantity, seat, course } =
    modifierSelection;

  // Calculate price with modifiers
  const basePrice =
    typeof menuItem.price === "string"
      ? parseFloat(menuItem.price)
      : Number(menuItem.price);

  let modifierTotal = 0;
  selectedModifiers.forEach((modifierIds, groupId) => {
    const group = menuItem.modifierGroups.find(
      (mg: typeof menuItem.modifierGroups[number]) => mg.modifierGroup.id === groupId
    );
    if (!group) return;

    modifierIds.forEach((modifierId) => {
      const modifier = group.modifierGroup.modifiers.find((m: typeof group.modifierGroup.modifiers[number]) => m.id === modifierId);
      if (modifier) {
        const adjustment =
          typeof modifier.priceAdjustment === "string"
            ? parseFloat(modifier.priceAdjustment)
            : Number(modifier.priceAdjustment);
        modifierTotal += adjustment;
      }
    });
  });

  const itemTotal = (basePrice + modifierTotal) * quantity;

  const handleModifierToggle = (groupId: string, modifierId: string) => {
    const group = menuItem.modifierGroups.find(
      (mg: typeof menuItem.modifierGroups[number]) => mg.modifierGroup.id === groupId
    );
    if (!group) return;

    const currentSelection = selectedModifiers.get(groupId) || [];
    const isMultiSelect = group.modifierGroup.multiSelect;
    const maxSelections =
      group.maxSelections ?? group.modifierGroup.maxSelections;

    if (currentSelection.includes(modifierId)) {
      // Remove
      setModifierSelection(
        groupId,
        currentSelection.filter((id) => id !== modifierId)
      );
    } else {
      // Add
      if (isMultiSelect) {
        if (maxSelections && currentSelection.length >= maxSelections) {
          // At max, replace last
          setModifierSelection(groupId, [
            ...currentSelection.slice(0, -1),
            modifierId,
          ]);
        } else {
          setModifierSelection(groupId, [...currentSelection, modifierId]);
        }
      } else {
        // Single select
        setModifierSelection(groupId, [modifierId]);
      }
    }
  };

  const handleConfirm = () => {
    onConfirm();
    closeModifierSelection();
  };

  const handleCancel = () => {
    closeModifierSelection();
    onOpenChange(false);
  };

  // Check if required modifiers are satisfied
  const isValid = menuItem.modifierGroups.every((mg) => {
    const required = mg.required ?? mg.modifierGroup.required;
    const minSelections = mg.minSelections ?? mg.modifierGroup.minSelections;
    const selected = selectedModifiers.get(mg.modifierGroup.id) || [];

    if (required && selected.length === 0) return false;
    if (minSelections > 0 && selected.length < minSelections) return false;
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{menuItem.name}</DialogTitle>
          {menuItem.description && (
            <p className="text-sm text-muted-foreground">{menuItem.description}</p>
          )}
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Modifier Groups */}
          {menuItem.modifierGroups.map((mg: typeof menuItem.modifierGroups[number]) => {
            const group = mg.modifierGroup;
            const required = mg.required ?? group.required;
            const minSelections = mg.minSelections ?? group.minSelections;
            const maxSelections = mg.maxSelections ?? group.maxSelections;
            const currentSelection = selectedModifiers.get(group.id) || [];

            return (
              <div key={group.id}>
                <div className="flex items-center gap-2 mb-3">
                  <Label className="font-semibold">
                    {group.displayName || group.name}
                  </Label>
                  {required && (
                    <Badge variant="destructive" className="text-xs">
                      Required
                    </Badge>
                  )}
                  {!required && minSelections === 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Optional
                    </Badge>
                  )}
                  {maxSelections && group.multiSelect && (
                    <span className="text-xs text-muted-foreground">
                      (Select up to {maxSelections})
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {group.modifiers.map((modifier: typeof group.modifiers[number]) => {
                    const isSelected = currentSelection.includes(modifier.id);
                    const priceAdj =
                      typeof modifier.priceAdjustment === "string"
                        ? parseFloat(modifier.priceAdjustment)
                        : Number(modifier.priceAdjustment);

                    return (
                      <button
                        key={modifier.id}
                        onClick={() => handleModifierToggle(group.id, modifier.id)}
                        className={cn(
                          "p-3 rounded-lg border-2 text-left transition-all",
                          "min-h-touch",
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <div className="font-medium">{modifier.name}</div>
                        {priceAdj !== 0 && (
                          <div
                            className={cn(
                              "text-sm",
                              priceAdj > 0 ? "text-green-600" : "text-red-600"
                            )}
                          >
                            {priceAdj > 0 ? "+" : ""}
                            {formatCurrencyShort(priceAdj)}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <Separator />

          {/* Quantity & Seat & Course */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-sm">Quantity</Label>
              <div className="flex items-center gap-2 mt-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setItemQuantity(quantity - 1)}
                  disabled={quantity <= 1}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="w-8 text-center font-semibold">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setItemQuantity(quantity + 1)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-sm">Seat</Label>
              <div className="flex items-center gap-2 mt-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setItemSeat(seat - 1)}
                  disabled={seat <= 1}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="w-8 text-center font-semibold">{seat}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setItemSeat(seat + 1)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-sm">Course</Label>
              <div className="flex items-center gap-2 mt-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setItemCourse(course - 1)}
                  disabled={course <= 1}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="w-8 text-center font-semibold">{course}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setItemCourse(course + 1)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Special Instructions */}
          <div>
            <Label className="text-sm">Special Instructions</Label>
            <Input
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="e.g., allergies, preferences..."
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex-1 text-lg font-bold">
            Total: {formatCurrencyShort(itemTotal)}
          </div>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid}>
            Add to Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
