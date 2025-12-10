"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Input } from "@/components/ui/input";
import {
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  Users,
  Clock,
  DollarSign,
  Copy,
  Trash2,
  Edit,
} from "lucide-react";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  role: { name: string };
  hourlyRate?: number;
}

interface Shift {
  id: string;
  userId: string;
  user: { firstName: string; lastName: string };
  role: { name: string };
  startTime: Date;
  endTime: Date;
  status: "SCHEDULED" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "NO_SHOW" | "CANCELLED";
  notes?: string | null;
}

interface ScheduleProps {
  employees: Employee[];
  shifts: Shift[];
  weekStart: Date;
  onWeekChange: (date: Date) => void;
  onCreateShift: (shift: {
    userId: string;
    startTime: Date;
    endTime: Date;
    notes?: string;
  }) => Promise<void>;
  onUpdateShift: (shiftId: string, updates: Partial<Shift>) => Promise<void>;
  onDeleteShift: (shiftId: string) => Promise<void>;
  isSubmitting?: boolean;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const SHIFT_TEMPLATES = [
  { label: "Morning (6am-2pm)", start: 6, end: 14 },
  { label: "Day (10am-6pm)", start: 10, end: 18 },
  { label: "Swing (2pm-10pm)", start: 14, end: 22 },
  { label: "Night (4pm-12am)", start: 16, end: 24 },
  { label: "Double (10am-10pm)", start: 10, end: 22 },
];

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 border-blue-300 text-blue-800",
  CONFIRMED: "bg-green-100 border-green-300 text-green-800",
  IN_PROGRESS: "bg-yellow-100 border-yellow-300 text-yellow-800",
  COMPLETED: "bg-gray-100 border-gray-300 text-gray-600",
  NO_SHOW: "bg-red-100 border-red-300 text-red-800",
  CANCELLED: "bg-gray-100 border-gray-300 text-gray-400 line-through",
};

export function Schedule({
  employees,
  shifts,
  weekStart,
  onWeekChange,
  onCreateShift,
  onUpdateShift,
  onDeleteShift,
  isSubmitting,
}: ScheduleProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [formData, setFormData] = useState({
    userId: "",
    startHour: "10",
    startMinute: "00",
    endHour: "18",
    endMinute: "00",
    notes: "",
  });

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    return date;
  });

  // Get shifts for a specific day
  const getShiftsForDay = (dayIndex: number) => {
    const dayDate = weekDays[dayIndex];
    return shifts.filter((shift) => {
      const shiftDate = new Date(shift.startTime);
      return (
        shiftDate.getDate() === dayDate.getDate() &&
        shiftDate.getMonth() === dayDate.getMonth() &&
        shiftDate.getFullYear() === dayDate.getFullYear()
      );
    });
  };

  // Calculate weekly stats
  const totalHours = shifts.reduce((sum, shift) => {
    const start = new Date(shift.startTime);
    const end = new Date(shift.endTime);
    return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }, 0);

  const totalShifts = shifts.filter(s => s.status !== "CANCELLED").length;

  // Navigate weeks
  const prevWeek = () => {
    const newDate = new Date(weekStart);
    newDate.setDate(newDate.getDate() - 7);
    onWeekChange(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(weekStart);
    newDate.setDate(newDate.getDate() + 7);
    onWeekChange(newDate);
  };

  const openNewShift = (dayIndex: number) => {
    setSelectedDay(dayIndex);
    setEditingShift(null);
    setFormData({
      userId: "",
      startHour: "10",
      startMinute: "00",
      endHour: "18",
      endMinute: "00",
      notes: "",
    });
    setIsDialogOpen(true);
  };

  const openEditShift = (shift: Shift) => {
    const start = new Date(shift.startTime);
    const end = new Date(shift.endTime);
    const dayIndex = weekDays.findIndex(
      d => d.getDate() === start.getDate() && d.getMonth() === start.getMonth()
    );
    setSelectedDay(dayIndex >= 0 ? dayIndex : 0);
    setEditingShift(shift);
    setFormData({
      userId: shift.userId,
      startHour: start.getHours().toString().padStart(2, "0"),
      startMinute: start.getMinutes().toString().padStart(2, "0"),
      endHour: end.getHours().toString().padStart(2, "0"),
      endMinute: end.getMinutes().toString().padStart(2, "0"),
      notes: shift.notes || "",
    });
    setIsDialogOpen(true);
  };

  const applyTemplate = (template: { start: number; end: number }) => {
    setFormData({
      ...formData,
      startHour: template.start.toString().padStart(2, "0"),
      startMinute: "00",
      endHour: (template.end % 24).toString().padStart(2, "0"),
      endMinute: "00",
    });
  };

  const handleSubmit = async () => {
    if (!formData.userId) return;

    const dayDate = weekDays[selectedDay];
    const startTime = new Date(dayDate);
    startTime.setHours(parseInt(formData.startHour), parseInt(formData.startMinute), 0, 0);

    const endTime = new Date(dayDate);
    endTime.setHours(parseInt(formData.endHour), parseInt(formData.endMinute), 0, 0);

    // Handle overnight shifts
    if (endTime <= startTime) {
      endTime.setDate(endTime.getDate() + 1);
    }

    if (editingShift) {
      await onUpdateShift(editingShift.id, {
        startTime,
        endTime,
        notes: formData.notes || undefined,
      });
    } else {
      await onCreateShift({
        userId: formData.userId,
        startTime,
        endTime,
        notes: formData.notes || undefined,
      });
    }

    setIsDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!editingShift) return;
    await onDeleteShift(editingShift.id);
    setIsDialogOpen(false);
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const formatShiftDuration = (start: Date, end: Date) => {
    const hours = (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60);
    return `${hours.toFixed(1)}h`;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Schedule
            </h2>
            <p className="text-sm text-muted-foreground">
              Manage staff shifts and coverage
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={prevWeek}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-center min-w-[200px]">
              <p className="font-medium">
                {weekDays[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })} -{" "}
                {weekDays[6].toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
            <Button variant="outline" size="icon" onClick={nextWeek}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Users className="w-4 h-4" />
              <span>Total Shifts</span>
            </div>
            <p className="text-2xl font-bold">{totalShifts}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Clock className="w-4 h-4" />
              <span>Scheduled Hours</span>
            </div>
            <p className="text-2xl font-bold">{totalHours.toFixed(1)}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <DollarSign className="w-4 h-4" />
              <span>Est. Labor Cost</span>
            </div>
            <p className="text-2xl font-bold">
              ${(totalHours * 15).toFixed(0)}
            </p>
          </div>
        </div>
      </div>

      {/* Week Grid */}
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-7 min-w-[900px]">
          {/* Day Headers */}
          {weekDays.map((day, i) => {
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <div
                key={i}
                className={cn(
                  "p-3 border-b border-r text-center",
                  isToday && "bg-primary/5"
                )}
              >
                <p className="text-sm text-muted-foreground">{DAYS[day.getDay()]}</p>
                <p className={cn(
                  "text-lg font-bold",
                  isToday && "text-primary"
                )}>
                  {day.getDate()}
                </p>
              </div>
            );
          })}

          {/* Day Columns */}
          {weekDays.map((day, dayIndex) => {
            const dayShifts = getShiftsForDay(dayIndex);
            const isToday = day.toDateString() === new Date().toDateString();

            return (
              <div
                key={dayIndex}
                className={cn(
                  "min-h-[400px] border-r p-2 space-y-2",
                  isToday && "bg-primary/5"
                )}
              >
                {/* Add Shift Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full border-dashed border"
                  onClick={() => openNewShift(dayIndex)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Shift
                </Button>

                {/* Shifts */}
                {dayShifts.map((shift) => (
                  <div
                    key={shift.id}
                    className={cn(
                      "p-2 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity",
                      STATUS_COLORS[shift.status]
                    )}
                    onClick={() => openEditShift(shift)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-sm truncate">
                        {shift.user.firstName} {shift.user.lastName.charAt(0)}.
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {formatShiftDuration(shift.startTime, shift.endTime)}
                      </Badge>
                    </div>
                    <p className="text-xs opacity-75">
                      {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                    </p>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {shift.role.name}
                    </Badge>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Shift Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingShift ? "Edit Shift" : "New Shift"} -{" "}
              {weekDays[selectedDay]?.toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Employee Select */}
            <div>
              <label className="text-sm font-medium">Employee</label>
              <Select
                value={formData.userId}
                onValueChange={(v) => setFormData({ ...formData, userId: v })}
                disabled={!!editingShift}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} - {emp.role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quick Templates */}
            <div>
              <label className="text-sm font-medium mb-2 block">Quick Templates</label>
              <div className="flex flex-wrap gap-2">
                {SHIFT_TEMPLATES.map((template) => (
                  <Button
                    key={template.label}
                    variant="outline"
                    size="sm"
                    onClick={() => applyTemplate(template)}
                  >
                    {template.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Time Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start Time</label>
                <div className="flex gap-1">
                  <Select
                    value={formData.startHour}
                    onValueChange={(v) => setFormData({ ...formData, startHour: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOURS.map((h) => (
                        <SelectItem key={h} value={h.toString().padStart(2, "0")}>
                          {h.toString().padStart(2, "0")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="flex items-center">:</span>
                  <Select
                    value={formData.startMinute}
                    onValueChange={(v) => setFormData({ ...formData, startMinute: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["00", "15", "30", "45"].map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">End Time</label>
                <div className="flex gap-1">
                  <Select
                    value={formData.endHour}
                    onValueChange={(v) => setFormData({ ...formData, endHour: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOURS.map((h) => (
                        <SelectItem key={h} value={h.toString().padStart(2, "0")}>
                          {h.toString().padStart(2, "0")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="flex items-center">:</span>
                  <Select
                    value={formData.endMinute}
                    onValueChange={(v) => setFormData({ ...formData, endMinute: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["00", "15", "30", "45"].map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium">Notes (optional)</label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Training, event coverage, etc."
              />
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            {editingShift && (
              <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !formData.userId}
              >
                {isSubmitting ? "Saving..." : editingShift ? "Update" : "Create"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
