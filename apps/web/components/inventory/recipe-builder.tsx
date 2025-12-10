"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChefHat,
  Plus,
  Trash2,
  Edit,
  Save,
  DollarSign,
  Clock,
  Scale,
  Search,
} from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  unitCost: number;
}

interface RecipeIngredient {
  id: string;
  inventoryItemId: string;
  inventoryItem: InventoryItem;
  quantity: number;
  unit: string;
  cost: number;
}

interface Recipe {
  id: string;
  name: string;
  description: string | null;
  yield: number;
  yieldUnit: string;
  instructions: string | null;
  prepTime: number | null;
  cookTime: number | null;
  ingredientCost: number;
  costPerPortion: number;
  menuItem: { name: string; price: number } | null;
  ingredients: RecipeIngredient[];
}

interface RecipeBuilderProps {
  recipes: Recipe[];
  inventoryItems: InventoryItem[];
  onCreateRecipe: (recipe: Omit<Recipe, "id" | "ingredientCost" | "costPerPortion" | "ingredients" | "menuItem"> & {
    ingredients: Array<{ inventoryItemId: string; quantity: number; unit: string }>;
  }) => Promise<void>;
  onUpdateRecipe: (id: string, updates: Partial<Recipe>) => Promise<void>;
  onDeleteRecipe: (id: string) => Promise<void>;
  onAddIngredient: (recipeId: string, ingredient: { inventoryItemId: string; quantity: number; unit: string }) => Promise<void>;
  onRemoveIngredient: (recipeId: string, ingredientId: string) => Promise<void>;
}

export function RecipeBuilder({
  recipes,
  inventoryItems,
  onCreateRecipe,
  onUpdateRecipe,
  onDeleteRecipe,
  onAddIngredient,
  onRemoveIngredient,
}: RecipeBuilderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newRecipe, setNewRecipe] = useState({
    name: "",
    description: "",
    yield: 1,
    yieldUnit: "portion",
    instructions: "",
    prepTime: 0,
    cookTime: 0,
  });
  const [newIngredient, setNewIngredient] = useState({
    inventoryItemId: "",
    quantity: 0,
    unit: "",
  });
  const [addIngredientOpen, setAddIngredientOpen] = useState(false);

  // Filter recipes
  const filteredRecipes = recipes.filter((recipe) =>
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateRecipe = async () => {
    await onCreateRecipe({
      ...newRecipe,
      ingredients: [],
    });
    setIsCreating(false);
    setNewRecipe({
      name: "",
      description: "",
      yield: 1,
      yieldUnit: "portion",
      instructions: "",
      prepTime: 0,
      cookTime: 0,
    });
  };

  const handleAddIngredient = async () => {
    if (!selectedRecipe || !newIngredient.inventoryItemId) return;
    await onAddIngredient(selectedRecipe.id, newIngredient);
    setAddIngredientOpen(false);
    setNewIngredient({ inventoryItemId: "", quantity: 0, unit: "" });
  };

  const getProfitMargin = (recipe: Recipe) => {
    if (!recipe.menuItem) return null;
    const cost = recipe.costPerPortion;
    const price = recipe.menuItem.price;
    const margin = ((price - cost) / price) * 100;
    return margin;
  };

  return (
    <div className="h-full flex">
      {/* Recipe List */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold flex items-center gap-2">
              <ChefHat className="w-5 h-5" />
              Recipes
            </h2>
            <Button size="sm" onClick={() => setIsCreating(true)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search recipes..."
              className="pl-10"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredRecipes.map((recipe) => {
              const margin = getProfitMargin(recipe);
              return (
                <button
                  key={recipe.id}
                  onClick={() => setSelectedRecipe(recipe)}
                  className={cn(
                    "w-full p-3 rounded-lg text-left transition-colors",
                    selectedRecipe?.id === recipe.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <p className="font-medium">{recipe.name}</p>
                  <div className="flex items-center gap-2 mt-1 text-sm opacity-80">
                    <span>{formatCurrency(recipe.costPerPortion)}/portion</span>
                    {margin !== null && (
                      <Badge
                        variant={margin >= 65 ? "success" : margin >= 50 ? "secondary" : "warning"}
                        className="text-xs"
                      >
                        {margin.toFixed(0)}% margin
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Recipe Detail / Create Form */}
      <div className="flex-1 flex flex-col">
        {isCreating ? (
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-bold">Create New Recipe</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Recipe Name</label>
                <Input
                  value={newRecipe.name}
                  onChange={(e) =>
                    setNewRecipe({ ...newRecipe, name: e.target.value })
                  }
                  placeholder="e.g., Classic Burger"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={newRecipe.description}
                  onChange={(e) =>
                    setNewRecipe({ ...newRecipe, description: e.target.value })
                  }
                  placeholder="Brief description"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Yield</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={newRecipe.yield}
                    onChange={(e) =>
                      setNewRecipe({
                        ...newRecipe,
                        yield: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-24"
                  />
                  <Input
                    value={newRecipe.yieldUnit}
                    onChange={(e) =>
                      setNewRecipe({ ...newRecipe, yieldUnit: e.target.value })
                    }
                    placeholder="portions"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Prep Time (min)</label>
                <Input
                  type="number"
                  value={newRecipe.prepTime}
                  onChange={(e) =>
                    setNewRecipe({
                      ...newRecipe,
                      prepTime: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Cook Time (min)</label>
                <Input
                  type="number"
                  value={newRecipe.cookTime}
                  onChange={(e) =>
                    setNewRecipe({
                      ...newRecipe,
                      cookTime: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Instructions</label>
              <Textarea
                value={newRecipe.instructions}
                onChange={(e) =>
                  setNewRecipe({ ...newRecipe, instructions: e.target.value })
                }
                placeholder="Step-by-step instructions..."
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateRecipe} disabled={!newRecipe.name}>
                Create Recipe
              </Button>
            </div>
          </div>
        ) : selectedRecipe ? (
          <div className="flex-1 flex flex-col">
            {/* Recipe Header */}
            <div className="p-6 border-b">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-bold">{selectedRecipe.name}</h3>
                  {selectedRecipe.description && (
                    <p className="text-muted-foreground mt-1">
                      {selectedRecipe.description}
                    </p>
                  )}
                  {selectedRecipe.menuItem && (
                    <Badge variant="outline" className="mt-2">
                      Linked to: {selectedRecipe.menuItem.name}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    onDeleteRecipe(selectedRecipe.id);
                    setSelectedRecipe(null);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 mt-4">
                <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Scale className="w-4 h-4" />
                    <span>Yield</span>
                  </div>
                  <p className="text-lg font-bold">
                    {selectedRecipe.yield} {selectedRecipe.yieldUnit}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>Total Time</span>
                  </div>
                  <p className="text-lg font-bold">
                    {(selectedRecipe.prepTime || 0) + (selectedRecipe.cookTime || 0)} min
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <DollarSign className="w-4 h-4" />
                    <span>Cost/Portion</span>
                  </div>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(selectedRecipe.costPerPortion)}
                  </p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <DollarSign className="w-4 h-4" />
                    <span>Total Cost</span>
                  </div>
                  <p className="text-lg font-bold text-blue-600">
                    {formatCurrency(selectedRecipe.ingredientCost)}
                  </p>
                </div>
              </div>
            </div>

            {/* Ingredients */}
            <div className="flex-1 overflow-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold">Ingredients</h4>
                <Button size="sm" onClick={() => setAddIngredientOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Ingredient
                </Button>
              </div>

              <div className="space-y-2">
                {selectedRecipe.ingredients.map((ingredient) => (
                  <div
                    key={ingredient.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-lg">
                        {ingredient.quantity} {ingredient.unit}
                      </span>
                      <span className="font-medium">
                        {ingredient.inventoryItem.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">
                        {formatCurrency(ingredient.cost)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() =>
                          onRemoveIngredient(selectedRecipe.id, ingredient.id)
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {selectedRecipe.ingredients.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No ingredients added yet</p>
                    <p className="text-sm">Click "Add Ingredient" to start building this recipe</p>
                  </div>
                )}
              </div>

              {/* Instructions */}
              {selectedRecipe.instructions && (
                <div className="mt-6">
                  <h4 className="font-bold mb-2">Instructions</h4>
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg whitespace-pre-wrap">
                    {selectedRecipe.instructions}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <ChefHat className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a recipe to view details</p>
              <p className="text-sm">or create a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* Add Ingredient Dialog */}
      <Dialog open={addIngredientOpen} onOpenChange={setAddIngredientOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Ingredient</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Ingredient</label>
              <Select
                value={newIngredient.inventoryItemId}
                onValueChange={(value) => {
                  const item = inventoryItems.find((i) => i.id === value);
                  setNewIngredient({
                    ...newIngredient,
                    inventoryItemId: value,
                    unit: item?.unit || "",
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select ingredient" />
                </SelectTrigger>
                <SelectContent>
                  {inventoryItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({formatCurrency(item.unitCost)}/{item.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Quantity</label>
                <Input
                  type="number"
                  step="0.01"
                  value={newIngredient.quantity}
                  onChange={(e) =>
                    setNewIngredient({
                      ...newIngredient,
                      quantity: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Unit</label>
                <Input
                  value={newIngredient.unit}
                  onChange={(e) =>
                    setNewIngredient({ ...newIngredient, unit: e.target.value })
                  }
                  placeholder="oz, lb, each, etc."
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddIngredientOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddIngredient}
              disabled={!newIngredient.inventoryItemId || !newIngredient.quantity}
            >
              Add Ingredient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
