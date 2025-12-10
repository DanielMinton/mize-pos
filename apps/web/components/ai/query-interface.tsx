"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  Send,
  TrendingUp,
  DollarSign,
  Users,
  Package,
  Clock,
  Loader2,
  ChevronRight,
  BarChart3,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  visualization?: {
    type: "number" | "list" | "chart" | "table";
    data: unknown;
  };
}

interface QueryInterfaceProps {
  onQuery: (query: string) => Promise<{
    answer: string;
    visualization?: Message["visualization"];
  }>;
  isLoading?: boolean;
}

const QUICK_QUERIES = [
  {
    label: "Top Sellers",
    query: "What were the top 5 selling items today?",
    icon: TrendingUp,
  },
  {
    label: "Today's Sales",
    query: "What are today's total sales?",
    icon: DollarSign,
  },
  {
    label: "Labor Cost",
    query: "What's today's labor cost as a percentage of sales?",
    icon: Users,
  },
  {
    label: "Low Stock",
    query: "Which items are running low in inventory?",
    icon: Package,
  },
  {
    label: "Peak Hours",
    query: "What were the busiest hours today?",
    icon: Clock,
  },
  {
    label: "Food Cost",
    query: "What's the current food cost percentage?",
    icon: BarChart3,
  },
];

const EXAMPLE_QUERIES = [
  "What sold best last Saturday?",
  "How much salmon do we have left?",
  "Compare this week's sales to last week",
  "Who worked the most hours this pay period?",
  "What's the profit margin on the ribeye?",
  "Which server had the highest average check today?",
  "Show me items that haven't sold in 7 days",
  "What's the waste trend for produce?",
];

export function QueryInterface({ onQuery, isLoading }: QueryInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [showExamples, setShowExamples] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (query: string) => {
    if (!query.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setShowExamples(false);

    try {
      const response = await onQuery(query);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.answer,
        timestamp: new Date(),
        visualization: response.visualization,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I couldn't process that query. Please try rephrasing or ask something else.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const renderVisualization = (viz: Message["visualization"]) => {
    if (!viz) return null;

    switch (viz.type) {
      case "number":
        return (
          <div className="p-4 bg-primary/10 rounded-lg text-center">
            <p className="text-4xl font-bold text-primary">
              {viz.data as string}
            </p>
          </div>
        );

      case "list":
        return (
          <ul className="space-y-2">
            {(viz.data as Array<{ label: string; value: string }>).map((item, i) => (
              <li key={i} className="flex justify-between p-2 bg-muted rounded">
                <span>{item.label}</span>
                <span className="font-mono font-bold">{item.value}</span>
              </li>
            ))}
          </ul>
        );

      case "table":
        const tableData = viz.data as { headers: string[]; rows: string[][] };
        return (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {tableData.headers.map((h, i) => (
                    <th key={i} className="text-left p-2 border-b font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} className="p-2 border-b">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">AI Assistant</h2>
            <p className="text-sm text-muted-foreground">
              Ask questions about your restaurant data
            </p>
          </div>
        </div>
      </div>

      {/* Quick Queries */}
      <div className="p-4 border-b">
        <div className="flex flex-wrap gap-2">
          {QUICK_QUERIES.map((q) => (
            <Button
              key={q.label}
              variant="outline"
              size="sm"
              onClick={() => handleSubmit(q.query)}
              disabled={isLoading}
            >
              <q.icon className="w-4 h-4 mr-1" />
              {q.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-4">
          {/* Welcome / Examples */}
          {showExamples && messages.length === 0 && (
            <div className="text-center py-8">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary/40" />
              <h3 className="text-lg font-medium mb-2">How can I help you?</h3>
              <p className="text-muted-foreground mb-6">
                Ask me anything about sales, inventory, labor, or operations
              </p>

              <div className="max-w-md mx-auto">
                <p className="text-sm font-medium mb-3 text-left">
                  Try asking:
                </p>
                <div className="space-y-2">
                  {EXAMPLE_QUERIES.slice(0, 5).map((q) => (
                    <button
                      key={q}
                      className="w-full text-left p-3 rounded-lg border hover:bg-muted transition-colors flex items-center justify-between group"
                      onClick={() => handleSubmit(q)}
                    >
                      <span className="text-sm">{q}</span>
                      <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Message List */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
              )}

              <div
                className={cn(
                  "max-w-[80%] rounded-lg p-4",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>

                {message.visualization && (
                  <div className="mt-4">
                    {renderVisualization(message.visualization)}
                  </div>
                )}

                <p className="text-xs opacity-50 mt-2">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-muted rounded-lg p-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(input);
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about sales, inventory, labor..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" disabled={!input.trim() || isLoading}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
