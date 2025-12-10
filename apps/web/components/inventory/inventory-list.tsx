"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  Package,
  AlertTriangle,
  TrendingDown,
  Edit,
  Trash2,
} from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  currentStock: number;
  parLevel: number;
  reorderPoint: number;
  unitCost: number;
  storageLocation: string | null;
  supplier: { name: string } | null;
}

interface InventoryListProps {
  items: InventoryItem[];
  onItemClick: (item: InventoryItem) => void;
  onAddItem: () => void;
  onEditItem: (item: InventoryItem) => void;
  onDeleteItem: (item: InventoryItem) => void;
  isLoading?: boolean;
}

const CATEGORIES = [
  "all",
  "Proteins",
  "Produce",
  "Dairy",
  "Dry Goods",
  "Beverages",
  "Alcohol",
  "Supplies",
  "Other",
];

export function InventoryList({
  items,
  onItemClick,
  onAddItem,
  onEditItem,
  onDeleteItem,
  isLoading,
}: InventoryListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showLowStock, setShowLowStock] = useState(false);

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || item.category === categoryFilter;
    const matchesLowStock = !showLowStock || item.currentStock <= item.reorderPoint;
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  // Stats
  const totalItems = items.length;
  const lowStockItems = items.filter((i) => i.currentStock <= i.reorderPoint).length;
  const outOfStockItems = items.filter((i) => i.currentStock === 0).length;
  const totalValue = items.reduce(
    (sum, item) => sum + item.currentStock * item.unitCost,
    0
  );

  const getStockStatus = (item: InventoryItem) => {
    if (item.currentStock === 0) return "out";
    if (item.currentStock <= item.reorderPoint) return "low";
    if (item.currentStock <= item.parLevel) return "ok";
    return "good";
  };

  const getStockBadge = (status: string) => {
    switch (status) {
      case "out":
        return <Badge variant="destructive">Out of Stock</Badge>;
      case "low":
        return <Badge variant="warning">Low Stock</Badge>;
      case "ok":
        return <Badge variant="secondary">OK</Badge>;
      case "good":
        return <Badge variant="success">In Stock</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4 p-4 border-b">
        <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Package className="w-4 h-4" />
            <span>Total Items</span>
          </div>
          <p className="text-2xl font-bold mt-1">{totalItems}</p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-600 text-sm">
            <TrendingDown className="w-4 h-4" />
            <span>Low Stock</span>
          </div>
          <p className="text-2xl font-bold mt-1 text-yellow-600">{lowStockItems}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg">
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>Out of Stock</span>
          </div>
          <p className="text-2xl font-bold mt-1 text-red-600">{outOfStockItems}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <span>Total Value</span>
          </div>
          <p className="text-2xl font-bold mt-1 text-green-600">
            {formatCurrency(totalValue)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search inventory..."
            className="pl-10"
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat === "all" ? "All Categories" : cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={showLowStock ? "default" : "outline"}
          onClick={() => setShowLowStock(!showLowStock)}
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Low Stock Only
        </Button>

        <Button onClick={onAddItem}>
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Table */}
      <ScrollArea className="flex-1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Current Stock</TableHead>
              <TableHead className="text-right">Par Level</TableHead>
              <TableHead className="text-right">Unit Cost</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item) => {
              const status = getStockStatus(item);
              return (
                <TableRow
                  key={item.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onItemClick(item)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      {item.storageLocation && (
                        <p className="text-xs text-muted-foreground">
                          {item.storageLocation}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {item.currentStock} {item.unit}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {item.parLevel} {item.unit}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.unitCost)}/{item.unit}
                  </TableCell>
                  <TableCell>{getStockBadge(status)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.supplier?.name || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditItem(item);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteItem(item);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
