"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sparkles,
  ListTodo,
  RefreshCw,
  Clock,
  TrendingUp,
  Calendar,
  ChefHat,
  CheckCircle2,
  Circle,
  Loader2,
  AlertTriangle,
} from "lucide-react";

interface PrepTask {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  station: string;
  priority: "high" | "medium" | "low";
  estimatedTime: number; // minutes
  reason: string;
  completed: boolean;
  assignedTo?: string;
  dueBy?: string;
}

interface ForecastData {
  expectedCovers: number;
  dayOfWeek: string;
  weather: string;
  events: string[];
  comparison: {
    lastWeek: number;
    changePercent: number;
  };
}

interface PrepListProps {
  tasks: PrepTask[];
  forecast: ForecastData;
  currentDate: Date;
  onGenerateTasks: () => Promise<void>;
  onToggleTask: (taskId: string, completed: boolean) => Promise<void>;
  isGenerating?: boolean;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-800 border-red-300",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
  low: "bg-green-100 text-green-800 border-green-300",
};

const STATIONS = ["Prep", "Grill", "Sauté", "Garde Manger", "Pastry", "Bar"];

export function PrepList({
  tasks,
  forecast,
  currentDate,
  onGenerateTasks,
  onToggleTask,
  isGenerating,
}: PrepListProps) {
  const [selectedStation, setSelectedStation] = useState<string | null>(null);

  // Filter by station
  const filteredTasks = selectedStation
    ? tasks.filter((t) => t.station === selectedStation)
    : tasks;

  // Calculate stats
  const completedTasks = tasks.filter((t) => t.completed).length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const totalTime = tasks
    .filter((t) => !t.completed)
    .reduce((sum, t) => sum + t.estimatedTime, 0);

  const highPriorityRemaining = tasks.filter(
    (t) => t.priority === "high" && !t.completed
  ).length;

  // Group by station
  const tasksByStation = STATIONS.reduce((acc, station) => {
    acc[station] = tasks.filter((t) => t.station === station);
    return acc;
  }, {} as Record<string, PrepTask[]>);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ListTodo className="w-5 h-5" />
              Prep List
            </h2>
            <p className="text-sm text-muted-foreground">
              {currentDate.toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <Button onClick={onGenerateTasks} disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            {isGenerating ? "Generating..." : "Regenerate List"}
          </Button>
        </div>

        {/* Forecast Card */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              AI Forecast for Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-3xl font-bold">{forecast.expectedCovers}</p>
                <p className="text-xs text-muted-foreground">Expected Covers</p>
              </div>
              <div>
                <p className="text-lg font-medium">{forecast.dayOfWeek}</p>
                <p className="text-xs text-muted-foreground">{forecast.weather}</p>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className={cn(
                    "text-lg font-bold",
                    forecast.comparison.changePercent >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {forecast.comparison.changePercent >= 0 ? "+" : ""}
                    {forecast.comparison.changePercent}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">vs Last Week</p>
              </div>
              <div>
                {forecast.events.length > 0 ? (
                  <>
                    <Badge variant="secondary" className="mb-1">
                      {forecast.events[0]}
                    </Badge>
                    <p className="text-xs text-muted-foreground">Local Event</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No special events</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <p className="font-medium">
            {completedTasks} of {totalTasks} tasks completed
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {Math.floor(totalTime / 60)}h {totalTime % 60}m remaining
            </span>
            {highPriorityRemaining > 0 && (
              <span className="flex items-center gap-1 text-red-600">
                <AlertTriangle className="w-4 h-4" />
                {highPriorityRemaining} high priority
              </span>
            )}
          </div>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Station Filters */}
      <div className="p-4 border-b flex gap-2 overflow-x-auto">
        <Button
          variant={selectedStation === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedStation(null)}
        >
          All ({tasks.length})
        </Button>
        {STATIONS.map((station) => {
          const stationTasks = tasksByStation[station] || [];
          const completedCount = stationTasks.filter((t) => t.completed).length;
          if (stationTasks.length === 0) return null;

          return (
            <Button
              key={station}
              variant={selectedStation === station ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedStation(station)}
            >
              {station} ({completedCount}/{stationTasks.length})
            </Button>
          );
        })}
      </div>

      {/* Task List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <ListTodo className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
              <p className="text-muted-foreground mb-4">
                {tasks.length === 0
                  ? "No prep tasks generated yet"
                  : "No tasks for this station"}
              </p>
              {tasks.length === 0 && (
                <Button onClick={onGenerateTasks} disabled={isGenerating}>
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Generate Prep List
                </Button>
              )}
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "p-4 rounded-lg border flex items-start gap-4 transition-all",
                  task.completed && "bg-muted/50 opacity-60"
                )}
              >
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={(checked) =>
                    onToggleTask(task.id, checked as boolean)
                  }
                  className="mt-1"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p
                        className={cn(
                          "font-medium",
                          task.completed && "line-through"
                        )}
                      >
                        {task.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {task.quantity} {task.unit}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={PRIORITY_COLORS[task.priority]}
                      >
                        {task.priority}
                      </Badge>
                      <Badge variant="secondary">
                        <ChefHat className="w-3 h-3 mr-1" />
                        {task.station}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {task.estimatedTime} min
                    </span>
                    {task.dueBy && (
                      <span className="text-muted-foreground">
                        Due by {task.dueBy}
                      </span>
                    )}
                    {task.assignedTo && (
                      <Badge variant="outline" className="text-xs">
                        {task.assignedTo}
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1">
                    <Sparkles className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    {task.reason}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
