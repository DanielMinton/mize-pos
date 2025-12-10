"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Trash2,
  Plus,
  AlertTriangle,
  TrendingDown,
  Calendar,
  Search,
} from "lucide-react";

const WASTE_REASONS = [
  { value: "EXPIRED", label: "Expired" },
  { value: "SPOILED", label: "Spoiled" },
  { value: "OVERPRODUCTION", label: "Overproduction" },
  { value: "CUSTOMER_RETURN", label: "Customer Return" },
  { value: "PREPARATION_ERROR", label: "Prep Error" },
  { value: "SPILLAGE", label: "Spillage" },
  { value: "OTHER", label: "Other" },
];

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  unitCost: number;
  currentStock: number;
}

interface WasteEntry {
  id: string;
  inventoryItem: { name: string; unit: string };
  quantity: number;
  reason: string;
  notes: string | null;
  cost: number;
  loggedBy: { firstName: string; lastName: string };
  createdAt: Date;
}

interface WasteLogProps {
  inventoryItems: InventoryItem[];
  wasteLogs: WasteEntry[];
  onLogWaste: (entry: {
    inventoryItemId: string;
    quantity: number;
    reason: string;
    notes?: string;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

export function WasteLog({
  inventoryItems,
  wasteLogs,
  onLogWaste,
  isSubmitting,
}: WasteLogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "month" | "all">("today");

  // Filter waste logs
  const filteredLogs = wasteLogs.filter((log) => {
    const logDate = new Date(log.createdAt);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    switch (dateFilter) {
      case "today":
        return logDate >= today;
      case "week":
        return logDate >= weekAgo;
      case "month":
        return logDate >= monthAgo;
      default:
        return true;
    }
  }).filter((log) =>
    log.inventoryItem.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const totalWasteCost = filteredLogs.reduce((sum, log) => sum + log.cost, 0);
  const wasteByReason = WASTE_REASONS.map((r) => ({
    ...r,
    count: filteredLogs.filter((l) => l.reason === r.value).length,
    cost: filteredLogs
      .filter((l) => l.reason === r.value)
      .reduce((sum, l) => sum + l.cost, 0),
  })).filter((r) => r.count > 0);

  const handleSubmit = async () => {
    if (!selectedItem || !quantity || !reason) return;

    await onLogWaste({
      inventoryItemId: selectedItem.id,
      quantity: parseFloat(quantity),
      reason,
      notes: notes || undefined,
    });

    setIsOpen(false);
    setSelectedItem(null);
    setQuantity("");
    setReason("");
    setNotes("");
  };

  const estimatedCost = selectedItem
    ? parseFloat(quantity || "0") * selectedItem.unitCost
    : 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Waste Log
            </h2>
            <p className="text-sm text-muted-foreground">
              Track and analyze food waste
            </p>
          </div>
          <Button onClick={() => setIsOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Log Waste
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <TrendingDown className="w-4 h-4" />
              <span>Total Waste Cost</span>
            </div>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(totalWasteCost)}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>Entries</span>
            </div>
            <p className="text-2xl font-bold">{filteredLogs.length}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Top Reasons</div>
            <div className="flex flex-wrap gap-1">
              {wasteByReason.slice(0, 3).map((r) => (
                <Badge key={r.value} variant="outline" className="text-xs">
                  {r.label}: {r.count}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search waste logs..."
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Select value={dateFilter} onValueChange={(v: typeof dateFilter) => setDateFilter(v)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Waste Log Table */}
      <ScrollArea className="flex-1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date/Time</TableHead>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead>Logged By</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-muted-foreground">
                  {new Date(log.createdAt).toLocaleString()}
                </TableCell>
                <TableCell className="font-medium">
                  {log.inventoryItem.name}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {log.quantity} {log.inventoryItem.unit}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {WASTE_REASONS.find((r) => r.value === log.reason)?.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-red-600 font-medium">
                  {formatCurrency(log.cost)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {log.loggedBy.firstName} {log.loggedBy.lastName.charAt(0)}.
                </TableCell>
                <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                  {log.notes || "-"}
                </TableCell>
              </TableRow>
            ))}
            {filteredLogs.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No waste logged for this period
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>

      {/* Log Waste Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Waste</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Item</label>
              <Select
                value={selectedItem?.id || ""}
                onValueChange={(value) =>
                  setSelectedItem(inventoryItems.find((i) => i.id === value) || null)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent>
                  {inventoryItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.currentStock} {item.unit} in stock)
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
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder={selectedItem ? `${selectedItem.unit}` : ""}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Reason</label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {WASTE_REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional details..."
                rows={2}
              />
            </div>

            {estimatedCost > 0 && (
              <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                <p className="text-sm text-red-600">Estimated Cost</p>
                <p className="text-xl font-bold text-red-600">
                  {formatCurrency(estimatedCost)}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedItem || !quantity || !reason}
            >
              {isSubmitting ? "Logging..." : "Log Waste"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
