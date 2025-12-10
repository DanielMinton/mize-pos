"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Clock,
  DollarSign,
  User,
  Plus,
  AlertCircle,
} from "lucide-react";

interface TableOrder {
  id: string;
  orderNumber: number;
  status: string;
  total: number;
  createdAt: Date;
  server: { firstName: string; lastName: string } | null;
}

interface Table {
  id: string;
  name: string;
  section: string | null;
  capacity: number;
  posX: number | null;
  posY: number | null;
  orders: TableOrder[];
}

type TableStatus = "available" | "occupied" | "dirty" | "reserved";

interface TableMapProps {
  tables: Table[];
  selectedTableId: string | null;
  onTableSelect: (tableId: string) => void;
  onNewOrder: (tableId: string) => void;
  viewMode?: "grid" | "floor";
}

function getTableStatus(table: Table): TableStatus {
  if (table.orders.length > 0) {
    return "occupied";
  }
  return "available";
}

function getStatusColor(status: TableStatus): string {
  switch (status) {
    case "available":
      return "bg-green-500";
    case "occupied":
      return "bg-blue-500";
    case "dirty":
      return "bg-yellow-500";
    case "reserved":
      return "bg-purple-500";
    default:
      return "bg-gray-500";
  }
}

function getElapsedTime(date: Date): string {
  const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export function TableMap({
  tables,
  selectedTableId,
  onTableSelect,
  onNewOrder,
  viewMode = "grid",
}: TableMapProps) {
  const [sectionFilter, setSectionFilter] = useState<string>("all");

  // Get unique sections
  const sections = ["all", ...new Set(tables.map((t) => t.section || "Main"))];

  // Filter tables by section
  const filteredTables =
    sectionFilter === "all"
      ? tables
      : tables.filter((t) => (t.section || "Main") === sectionFilter);

  // Group by section for grid view
  const tablesBySection = filteredTables.reduce(
    (acc, table) => {
      const section = table.section || "Main";
      if (!acc[section]) acc[section] = [];
      acc[section].push(table);
      return acc;
    },
    {} as Record<string, Table[]>
  );

  // Stats
  const totalTables = tables.length;
  const occupiedTables = tables.filter((t) => t.orders.length > 0).length;
  const availableTables = totalTables - occupiedTables;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold">Tables</h2>
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>{availableTables} Open</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>{occupiedTables} Occupied</span>
            </div>
          </div>
        </div>

        <Select value={sectionFilter} onValueChange={setSectionFilter}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sections.map((section) => (
              <SelectItem key={section} value={section}>
                {section === "all" ? "All Sections" : section}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table Grid */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {Object.entries(tablesBySection).map(([section, sectionTables]) => (
            <div key={section}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                {section}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {sectionTables.map((table) => (
                  <TableCard
                    key={table.id}
                    table={table}
                    isSelected={selectedTableId === table.id}
                    onSelect={() => onTableSelect(table.id)}
                    onNewOrder={() => onNewOrder(table.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface TableCardProps {
  table: Table;
  isSelected: boolean;
  onSelect: () => void;
  onNewOrder: () => void;
}

function TableCard({ table, isSelected, onSelect, onNewOrder }: TableCardProps) {
  const status = getTableStatus(table);
  const activeOrder = table.orders[0];

  return (
    <button
      onClick={status === "available" ? onNewOrder : onSelect}
      className={cn(
        "relative p-4 rounded-lg border-2 transition-all touch-manipulation",
        "flex flex-col items-center justify-center min-h-[120px]",
        isSelected ? "border-primary ring-2 ring-primary/20" : "border-gray-200",
        status === "available" && "bg-green-50 dark:bg-green-950 hover:bg-green-100",
        status === "occupied" && "bg-blue-50 dark:bg-blue-950 hover:bg-blue-100",
        status === "dirty" && "bg-yellow-50 dark:bg-yellow-950",
        status === "reserved" && "bg-purple-50 dark:bg-purple-950"
      )}
    >
      {/* Status indicator */}
      <div
        className={cn(
          "absolute top-2 right-2 w-3 h-3 rounded-full",
          getStatusColor(status)
        )}
      />

      {/* Table name */}
      <span className="text-lg font-bold">{table.name}</span>

      {/* Capacity */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
        <Users className="w-3 h-3" />
        <span>{table.capacity}</span>
      </div>

      {/* Active order info */}
      {activeOrder ? (
        <div className="mt-2 text-center">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{getElapsedTime(activeOrder.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1 text-sm font-medium mt-1">
            <DollarSign className="w-3 h-3" />
            <span>{formatCurrency(activeOrder.total)}</span>
          </div>
          {activeOrder.server && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <User className="w-3 h-3" />
              <span>
                {activeOrder.server.firstName} {activeOrder.server.lastName.charAt(0)}.
              </span>
            </div>
          )}
        </div>
      ) : (
        <Badge variant="outline" className="mt-2">
          <Plus className="w-3 h-3 mr-1" />
          New Order
        </Badge>
      )}
    </button>
  );
}

// Dialog version for selecting a table
interface TableSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tables: Table[];
  onTableSelect: (tableId: string) => void;
  title?: string;
}

export function TableSelectDialog({
  open,
  onOpenChange,
  tables,
  onTableSelect,
  title = "Select Table",
}: TableSelectDialogProps) {
  const handleSelect = (tableId: string) => {
    onTableSelect(tableId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh]">
          <div className="grid grid-cols-3 gap-3 p-1">
            {tables.map((table) => {
              const status = getTableStatus(table);
              return (
                <button
                  key={table.id}
                  onClick={() => handleSelect(table.id)}
                  className={cn(
                    "p-4 rounded-lg border-2 transition-all touch-manipulation",
                    "flex flex-col items-center justify-center min-h-[100px]",
                    "border-gray-200 hover:border-primary",
                    status === "available" && "bg-green-50 dark:bg-green-950",
                    status === "occupied" && "bg-blue-50 dark:bg-blue-950"
                  )}
                >
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full mb-2",
                      getStatusColor(status)
                    )}
                  />
                  <span className="font-bold">{table.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {table.section || "Main"} - {table.capacity} seats
                  </span>
                  {status === "occupied" && table.orders[0] && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      #{table.orders[0].orderNumber}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
