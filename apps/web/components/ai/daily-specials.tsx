"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sparkles,
  ChefHat,
  RefreshCw,
  Check,
  Edit,
  Trash2,
  TrendingUp,
  Package,
  DollarSign,
  Loader2,
  Plus,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Sun,
} from "lucide-react";

interface SpecialSuggestion {
  id: string;
  name: string;
  description: string;
  suggestedPrice: number;
  estimatedCost: number;
  profitMargin: number;
  keyIngredients: string[];
  reasoning: string;
  category: string;
  prepTime?: number;
  status: "suggested" | "approved" | "rejected";
}

interface InventoryHighlight {
  name: string;
  quantity: number;
  unit: string;
  daysUntilExpiry?: number;
  status: "use_first" | "excess" | "expiring";
}

interface DailySpecialsProps {
  suggestions: SpecialSuggestion[];
  inventoryHighlights: InventoryHighlight[];
  currentDate: Date;
  onGenerateSuggestions: () => Promise<void>;
  onApproveSpecial: (special: SpecialSuggestion) => Promise<void>;
  onRejectSpecial: (id: string) => Promise<void>;
  onEditSpecial: (id: string, updates: Partial<SpecialSuggestion>) => Promise<void>;
  isGenerating?: boolean;
  isSubmitting?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  use_first: "bg-yellow-100 text-yellow-800 border-yellow-300",
  excess: "bg-blue-100 text-blue-800 border-blue-300",
  expiring: "bg-red-100 text-red-800 border-red-300",
};

export function DailySpecials({
  suggestions,
  inventoryHighlights,
  currentDate,
  onGenerateSuggestions,
  onApproveSpecial,
  onRejectSpecial,
  onEditSpecial,
  isGenerating,
  isSubmitting,
}: DailySpecialsProps) {
  const [editingSpecial, setEditingSpecial] = useState<SpecialSuggestion | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    suggestedPrice: "",
  });

  const approvedCount = suggestions.filter(s => s.status === "approved").length;
  const pendingCount = suggestions.filter(s => s.status === "suggested").length;

  const openEdit = (special: SpecialSuggestion) => {
    setEditingSpecial(special);
    setEditForm({
      name: special.name,
      description: special.description,
      suggestedPrice: special.suggestedPrice.toString(),
    });
  };

  const handleSaveEdit = async () => {
    if (!editingSpecial) return;
    await onEditSpecial(editingSpecial.id, {
      name: editForm.name,
      description: editForm.description,
      suggestedPrice: parseFloat(editForm.suggestedPrice),
    });
    setEditingSpecial(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ChefHat className="w-5 h-5" />
              Daily Specials
            </h2>
            <p className="text-sm text-muted-foreground">
              {currentDate.toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <Button onClick={onGenerateSuggestions} disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            {isGenerating ? "Generating..." : "Generate Suggestions"}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <Check className="w-4 h-4" />
              <span>Approved</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-600 text-sm">
              <Clock className="w-4 h-4" />
              <span>Pending Review</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Package className="w-4 h-4" />
              <span>Items to Use</span>
            </div>
            <p className="text-2xl font-bold">{inventoryHighlights.length}</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Inventory Highlights */}
          <div className="lg:col-span-1">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Inventory to Feature
            </h3>
            <div className="space-y-2">
              {inventoryHighlights.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No inventory highlights for today
                </p>
              ) : (
                inventoryHighlights.map((item, i) => (
                  <div
                    key={i}
                    className={cn(
                      "p-3 rounded-lg border",
                      STATUS_COLORS[item.status]
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <p className="font-medium">{item.name}</p>
                      <Badge variant="outline" className="text-xs">
                        {item.status === "use_first" && "Use First"}
                        {item.status === "excess" && "Excess"}
                        {item.status === "expiring" && "Expiring"}
                      </Badge>
                    </div>
                    <p className="text-sm opacity-75 mt-1">
                      {item.quantity} {item.unit}
                      {item.daysUntilExpiry !== undefined && (
                        <> - {item.daysUntilExpiry} days left</>
                      )}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Weather Context */}
            <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-950">
              <div className="flex items-center gap-2 mb-2">
                <Sun className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-600">Today's Context</span>
              </div>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Perfect weather for lighter dishes. Consider highlighting salads,
                grilled items, and refreshing cocktails.
              </p>
            </div>
          </div>

          {/* Suggestions */}
          <div className="lg:col-span-2">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AI Suggestions
            </h3>

            {suggestions.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
                  <p className="text-muted-foreground mb-4">
                    No suggestions generated yet
                  </p>
                  <Button onClick={onGenerateSuggestions} disabled={isGenerating}>
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Generate Based on Inventory
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {suggestions.map((special) => (
                  <Card
                    key={special.id}
                    className={cn(
                      special.status === "approved" && "border-green-300 bg-green-50/50 dark:bg-green-950/20",
                      special.status === "rejected" && "border-gray-300 bg-gray-50 opacity-50"
                    )}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge variant="outline" className="mb-2">
                            {special.category}
                          </Badge>
                          <CardTitle className="text-lg">{special.name}</CardTitle>
                          <CardDescription>{special.description}</CardDescription>
                        </div>
                        <Badge
                          variant={
                            special.status === "approved"
                              ? "success"
                              : special.status === "rejected"
                              ? "secondary"
                              : "warning"
                          }
                        >
                          {special.status}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Suggested Price</p>
                          <p className="text-lg font-bold text-green-600">
                            {formatCurrency(special.suggestedPrice)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Est. Cost</p>
                          <p className="text-lg font-bold">
                            {formatCurrency(special.estimatedCost)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Margin</p>
                          <p className="text-lg font-bold text-blue-600">
                            {special.profitMargin.toFixed(0)}%
                          </p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-xs text-muted-foreground mb-1">Key Ingredients</p>
                        <div className="flex flex-wrap gap-1">
                          {special.keyIngredients.map((ing, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {ing}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">
                          <Sparkles className="w-3 h-3 inline mr-1" />
                          AI Reasoning
                        </p>
                        <p className="text-sm">{special.reasoning}</p>
                      </div>
                    </CardContent>

                    {special.status === "suggested" && (
                      <CardFooter className="flex gap-2">
                        <Button
                          variant="pos-success"
                          className="flex-1"
                          onClick={() => onApproveSpecial(special)}
                          disabled={isSubmitting}
                        >
                          <ThumbsUp className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => openEdit(special)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => onRejectSpecial(special.id)}
                          disabled={isSubmitting}
                        >
                          <ThumbsDown className="w-4 h-4" />
                        </Button>
                      </CardFooter>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Edit Dialog */}
      <Dialog open={!!editingSpecial} onOpenChange={() => setEditingSpecial(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Special</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Price</label>
              <Input
                type="number"
                step="0.01"
                value={editForm.suggestedPrice}
                onChange={(e) => setEditForm({ ...editForm, suggestedPrice: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSpecial(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSubmitting}>
              Save & Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
