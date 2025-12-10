"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
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
  Clock,
  LogIn,
  LogOut,
  Coffee,
  User,
  Check,
  X,
  Delete,
} from "lucide-react";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  role: { name: string };
  pin?: string;
}

interface TimeEntry {
  id: string;
  userId: string;
  user: { firstName: string; lastName: string };
  clockIn: Date;
  clockOut: Date | null;
  breakStart: Date | null;
  breakEnd: Date | null;
  status: "CLOCKED_IN" | "ON_BREAK" | "CLOCKED_OUT";
}

interface TimeClockProps {
  employees: Employee[];
  todayEntries: TimeEntry[];
  onClockIn: (userId: string) => Promise<void>;
  onClockOut: (entryId: string) => Promise<void>;
  onStartBreak: (entryId: string) => Promise<void>;
  onEndBreak: (entryId: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function TimeClock({
  employees,
  todayEntries,
  onClockIn,
  onClockOut,
  onStartBreak,
  onEndBreak,
  isSubmitting,
}: TimeClockProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [action, setAction] = useState<"clock_in" | "clock_out" | "start_break" | "end_break">("clock_in");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Get active entry for employee
  const getActiveEntry = (userId: string) => {
    return todayEntries.find(
      (e) => e.userId === userId && e.status !== "CLOCKED_OUT"
    );
  };

  // Get status for employee
  const getEmployeeStatus = (userId: string) => {
    const entry = getActiveEntry(userId);
    if (!entry) return "OUT";
    if (entry.status === "ON_BREAK") return "BREAK";
    return "IN";
  };

  const handleAction = (employee: Employee, actionType: typeof action) => {
    setSelectedEmployee(employee);
    setAction(actionType);
    setPin("");
    setError("");
    setIsPinDialogOpen(true);
  };

  const handlePinDigit = (digit: string) => {
    if (pin.length < 4) {
      setPin(pin + digit);
    }
  };

  const handlePinBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handlePinClear = () => {
    setPin("");
    setError("");
  };

  const handlePinSubmit = async () => {
    if (!selectedEmployee) return;

    // Verify PIN
    if (selectedEmployee.pin && pin !== selectedEmployee.pin) {
      setError("Incorrect PIN");
      setPin("");
      return;
    }

    try {
      const activeEntry = getActiveEntry(selectedEmployee.id);

      switch (action) {
        case "clock_in":
          await onClockIn(selectedEmployee.id);
          break;
        case "clock_out":
          if (activeEntry) await onClockOut(activeEntry.id);
          break;
        case "start_break":
          if (activeEntry) await onStartBreak(activeEntry.id);
          break;
        case "end_break":
          if (activeEntry) await onEndBreak(activeEntry.id);
          break;
      }

      setIsPinDialogOpen(false);
    } catch {
      setError("Action failed. Please try again.");
    }
  };

  const formatDuration = (start: Date, end?: Date | null) => {
    const endTime = end ? new Date(end) : new Date();
    const diff = endTime.getTime() - new Date(start).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Calculate totals
  const clockedIn = employees.filter((e) => getEmployeeStatus(e.id) === "IN").length;
  const onBreak = employees.filter((e) => getEmployeeStatus(e.id) === "BREAK").length;

  return (
    <div className="h-full flex flex-col">
      {/* Clock Header */}
      <div className="p-6 bg-gradient-to-r from-primary/10 to-primary/5 border-b">
        <div className="text-center">
          <p className="text-6xl font-mono font-bold tracking-tight">
            {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
          <p className="text-lg text-muted-foreground mt-2">
            {currentTime.toLocaleDateString(undefined, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        <div className="flex justify-center gap-8 mt-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">{clockedIn}</p>
            <p className="text-sm text-muted-foreground">Clocked In</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-yellow-600">{onBreak}</p>
            <p className="text-sm text-muted-foreground">On Break</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-400">
              {employees.length - clockedIn - onBreak}
            </p>
            <p className="text-sm text-muted-foreground">Clocked Out</p>
          </div>
        </div>
      </div>

      {/* Employee List */}
      <ScrollArea className="flex-1">
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((employee) => {
            const status = getEmployeeStatus(employee.id);
            const activeEntry = getActiveEntry(employee.id);

            return (
              <div
                key={employee.id}
                className={cn(
                  "p-4 rounded-xl border-2 transition-colors",
                  status === "IN" && "border-green-300 bg-green-50 dark:bg-green-950/30",
                  status === "BREAK" && "border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30",
                  status === "OUT" && "border-gray-200 bg-gray-50 dark:bg-gray-900"
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center",
                      status === "IN" && "bg-green-200 text-green-700",
                      status === "BREAK" && "bg-yellow-200 text-yellow-700",
                      status === "OUT" && "bg-gray-200 text-gray-500"
                    )}>
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-lg">
                        {employee.firstName} {employee.lastName}
                      </p>
                      <Badge variant="outline">{employee.role.name}</Badge>
                    </div>
                  </div>
                  <Badge
                    variant={status === "IN" ? "success" : status === "BREAK" ? "warning" : "secondary"}
                  >
                    {status === "IN" ? "Clocked In" : status === "BREAK" ? "On Break" : "Off"}
                  </Badge>
                </div>

                {/* Time Info */}
                {activeEntry && (
                  <div className="mb-4 p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Clock In:</span>
                      <span className="font-mono">
                        {new Date(activeEntry.clockIn).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="font-mono font-bold">
                        {formatDuration(activeEntry.clockIn)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  {status === "OUT" && (
                    <Button
                      className="col-span-2"
                      variant="pos-success"
                      onClick={() => handleAction(employee, "clock_in")}
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      Clock In
                    </Button>
                  )}

                  {status === "IN" && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => handleAction(employee, "start_break")}
                      >
                        <Coffee className="w-4 h-4 mr-2" />
                        Break
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleAction(employee, "clock_out")}
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Clock Out
                      </Button>
                    </>
                  )}

                  {status === "BREAK" && (
                    <>
                      <Button
                        variant="pos-success"
                        onClick={() => handleAction(employee, "end_break")}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        End Break
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleAction(employee, "clock_out")}
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Clock Out
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* PIN Dialog */}
      <Dialog open={isPinDialogOpen} onOpenChange={setIsPinDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">
              {selectedEmployee?.firstName} {selectedEmployee?.lastName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Action Label */}
            <div className="text-center">
              <Badge
                variant={
                  action === "clock_in" ? "success" :
                  action === "clock_out" ? "destructive" :
                  "warning"
                }
                className="text-lg px-4 py-1"
              >
                {action === "clock_in" && "Clock In"}
                {action === "clock_out" && "Clock Out"}
                {action === "start_break" && "Start Break"}
                {action === "end_break" && "End Break"}
              </Badge>
            </div>

            {/* PIN Display */}
            <div className="flex justify-center gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "w-12 h-12 rounded-lg border-2 flex items-center justify-center text-2xl font-bold transition-all",
                    pin.length > i
                      ? "border-primary bg-primary/10"
                      : "border-gray-200"
                  )}
                >
                  {pin.length > i ? "•" : ""}
                </div>
              ))}
            </div>

            {/* Error Message */}
            {error && (
              <p className="text-center text-destructive font-medium">{error}</p>
            )}

            {/* PIN Pad */}
            <div className="grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"].map(
                (key) => {
                  if (key === "clear") {
                    return (
                      <Button
                        key={key}
                        variant="outline"
                        className="h-14 text-lg"
                        onClick={handlePinClear}
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    );
                  }
                  if (key === "back") {
                    return (
                      <Button
                        key={key}
                        variant="outline"
                        className="h-14 text-lg"
                        onClick={handlePinBackspace}
                      >
                        <Delete className="w-5 h-5" />
                      </Button>
                    );
                  }
                  return (
                    <Button
                      key={key}
                      variant="outline"
                      className="h-14 text-xl font-bold"
                      onClick={() => handlePinDigit(key)}
                    >
                      {key}
                    </Button>
                  );
                }
              )}
            </div>

            {/* Submit */}
            <Button
              className="w-full h-14 text-lg"
              onClick={handlePinSubmit}
              disabled={pin.length !== 4 || isSubmitting}
            >
              {isSubmitting ? "Processing..." : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
