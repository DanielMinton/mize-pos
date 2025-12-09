"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { trpc } from "@/lib/api/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Utensils,
  Clock,
  Search,
  RefreshCw,
  BarChart3,
  PieChart,
  Package,
  CalendarDays,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const DEMO_LOCATION_ID = "demo-location-id";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState("overview");
  const [query, setQuery] = useState("");
  const [dateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  // Fetch KPIs
  const { data: kpis, isLoading: loadingKPIs } = trpc.reports.getDashboardKPIs.useQuery(
    { locationId: DEMO_LOCATION_ID },
    { enabled: status === "authenticated" }
  );

  // Fetch sales summary
  const { data: salesSummary } = trpc.reports.getSalesSummary.useQuery(
    {
      locationId: DEMO_LOCATION_ID,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    },
    { enabled: status === "authenticated" }
  );

  // Fetch item sales
  const { data: itemSales } = trpc.reports.getItemSales.useQuery(
    {
      locationId: DEMO_LOCATION_ID,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      limit: 10,
    },
    { enabled: status === "authenticated" }
  );

  // Fetch 86'd items
  const { data: eightySixedItems } = trpc.menu.getEightySixed.useQuery(
    { locationId: DEMO_LOCATION_ID },
    { enabled: status === "authenticated" }
  );

  // Fetch low inventory
  const { data: lowInventory } = trpc.inventory.getItems.useQuery(
    { locationId: DEMO_LOCATION_ID, lowStock: true },
    { enabled: status === "authenticated" }
  );

  // Natural language query mutation
  const queryMutation = trpc.intelligence.query.useMutation();

  if (status === "loading" || loadingKPIs) {
    return (
      <div className="h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    redirect("/login");
  }

  const handleQuery = async () => {
    if (!query.trim()) return;
    await queryMutation.mutateAsync({
      locationId: DEMO_LOCATION_ID,
      query: query.trim(),
    });
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

  const formatPercent = (value: number) =>
    `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Manager Dashboard</h1>
            <p className="text-sm text-gray-500">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* AI Query Bar */}
            <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
              <MessageSquare className="w-4 h-4 text-gray-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleQuery()}
                placeholder="Ask anything... (e.g., 'What sold best last Saturday?')"
                className="border-0 bg-transparent w-64 focus-visible:ring-0"
              />
              <Button
                size="sm"
                onClick={handleQuery}
                disabled={queryMutation.isPending || !query.trim()}
              >
                {queryMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Alerts */}
            <div className="flex items-center gap-2">
              {eightySixedItems && eightySixedItems.length > 0 && (
                <Badge variant="eighty-six" className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {eightySixedItems.length} 86&apos;d
                </Badge>
              )}
              {lowInventory && lowInventory.length > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  {lowInventory.length} low stock
                </Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* AI Query Result */}
      {queryMutation.data && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <MessageSquare className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">Query: &quot;{query}&quot;</p>
                  <p className="text-gray-900">{queryMutation.data.answer}</p>
                  {queryMutation.data.metrics && queryMutation.data.metrics.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {queryMutation.data.metrics.map((metric, i) => (
                        <Badge key={i} variant="outline">
                          {metric.label}: {metric.value}
                          {metric.trend && (
                            <span className={metric.trend === "up" ? "text-green-500" : "text-red-500"}>
                              {metric.trend === "up" ? " ↑" : " ↓"}
                            </span>
                          )}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {queryMutation.data.suggestedQueries && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 mb-1">Try asking:</p>
                      <div className="flex flex-wrap gap-1">
                        {queryMutation.data.suggestedQueries.map((q, i) => (
                          <Button
                            key={i}
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              setQuery(q);
                              queryMutation.mutate({ locationId: DEMO_LOCATION_ID, query: q });
                            }}
                          >
                            {q}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => queryMutation.reset()}>
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Today&apos;s Sales</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(kpis?.todaySales || 0)}
                  </p>
                  {kpis && kpis.salesVsYesterday !== 0 && (
                    <div className={`flex items-center text-xs ${kpis.salesVsYesterday >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {kpis.salesVsYesterday >= 0 ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                      {formatPercent(kpis.salesVsYesterday)} vs yesterday
                    </div>
                  )}
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Today&apos;s Orders</p>
                  <p className="text-2xl font-bold">{kpis?.todayOrders || 0}</p>
                  <p className="text-xs text-gray-500">
                    {kpis?.todayGuests || 0} guests
                  </p>
                </div>
                <Utensils className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Check Average</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(kpis?.todayCheckAverage || 0)}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Active</p>
                  <p className="text-2xl font-bold">{kpis?.activeOrders || 0}</p>
                  <p className="text-xs text-gray-500">
                    {kpis?.currentCovers || 0} covers
                  </p>
                </div>
                <Users className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for detailed reports */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview">
              <PieChart className="w-4 h-4 mr-1" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="items">
              <BarChart3 className="w-4 h-4 mr-1" />
              Items
            </TabsTrigger>
            <TabsTrigger value="inventory">
              <Package className="w-4 h-4 mr-1" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="labor">
              <CalendarDays className="w-4 h-4 mr-1" />
              Labor
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Period Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>7-Day Summary</CardTitle>
                  <CardDescription>
                    {dateRange.startDate} to {dateRange.endDate}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {salesSummary ? (
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Gross Sales</span>
                        <span className="font-semibold">{formatCurrency(salesSummary.grossSales)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Discounts</span>
                        <span className="text-red-500">-{formatCurrency(salesSummary.discounts)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Net Sales</span>
                        <span className="font-bold text-lg">{formatCurrency(salesSummary.netSales)}</span>
                      </div>
                      <hr />
                      <div className="flex justify-between">
                        <span className="text-gray-500">Taxes</span>
                        <span>{formatCurrency(salesSummary.taxes)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tips</span>
                        <span>{formatCurrency(salesSummary.tips)}</span>
                      </div>
                      <hr />
                      <div className="flex justify-between">
                        <span className="text-gray-500">Orders</span>
                        <span>{salesSummary.orderCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Guests</span>
                        <span>{salesSummary.guestCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Check Average</span>
                        <span>{formatCurrency(salesSummary.checkAverage)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">PPA</span>
                        <span>{formatCurrency(salesSummary.ppaAverage)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Methods */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods</CardTitle>
                </CardHeader>
                <CardContent>
                  {salesSummary?.paymentsByMethod ? (
                    <div className="space-y-2">
                      {Object.entries(salesSummary.paymentsByMethod).map(([method, amount]) => {
                        const amountValue = amount as number;
                        return (
                          <div key={method} className="flex items-center justify-between">
                            <span className="capitalize text-gray-600">{method.toLowerCase()}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary"
                                  style={{
                                    width: `${(amountValue / salesSummary.netSales) * 100}%`,
                                  }}
                                />
                              </div>
                              <span className="font-medium">{formatCurrency(amountValue)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No data</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Alerts Section */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* 86'd Items */}
              <Card className={eightySixedItems?.length ? "border-red-200" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    86&apos;d Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {eightySixedItems && eightySixedItems.length > 0 ? (
                    <div className="space-y-2">
                      {eightySixedItems.map((item: typeof eightySixedItems[number]) => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-red-50 rounded">
                          <span className="font-medium text-red-900">{item.menuItem.name}</span>
                          <span className="text-sm text-red-600">{item.reason || "Out of stock"}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-green-600 text-center py-4">All items available</p>
                  )}
                </CardContent>
              </Card>

              {/* Low Inventory */}
              <Card className={lowInventory?.length ? "border-amber-200" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-amber-500" />
                    Low Stock Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {lowInventory && lowInventory.length > 0 ? (
                    <ScrollArea className="h-40">
                      <div className="space-y-2">
                        {lowInventory.slice(0, 5).map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-2 bg-amber-50 rounded">
                            <span className="font-medium text-amber-900">{item.name}</span>
                            <span className="text-sm text-amber-600">
                              {Number(item.currentStock)} / {Number(item.reorderPoint)} {item.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <p className="text-green-600 text-center py-4">All items stocked</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Items Tab */}
          <TabsContent value="items">
            <Card>
              <CardHeader>
                <CardTitle>Top Selling Items (7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                {itemSales && itemSales.length > 0 ? (
                  <div className="space-y-2">
                    {itemSales.map((item, index) => (
                      <div
                        key={item.menuItemId}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 flex items-center justify-center bg-primary/10 rounded-full text-sm font-bold text-primary">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-gray-500">{item.quantitySold} sold</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(item.revenue)}</p>
                          {item.cost && (
                            <p className="text-xs text-gray-500">
                              {((1 - item.cost / item.price) * 100).toFixed(0)}% margin
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No sales data available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Status</CardTitle>
                <CardDescription>Items requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                {lowInventory && lowInventory.length > 0 ? (
                  <div className="space-y-2">
                    {lowInventory.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-500">{item.category}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={Number(item.currentStock) <= 0 ? "destructive" : "secondary"}>
                            {Number(item.currentStock)} {item.unit}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            Par: {Number(item.parLevel)} | Reorder: {Number(item.reorderPoint)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-green-600 text-center py-8">All inventory levels healthy</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Labor Tab */}
          <TabsContent value="labor">
            <Card>
              <CardHeader>
                <CardTitle>Labor Overview</CardTitle>
                <CardDescription>Today&apos;s schedule and costs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Scheduled Today</p>
                    <p className="text-2xl font-bold">8</p>
                    <p className="text-xs text-gray-500">employees</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Clocked In</p>
                    <p className="text-2xl font-bold">6</p>
                    <p className="text-xs text-gray-500">on the floor</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Labor Cost</p>
                    <p className="text-2xl font-bold">22%</p>
                    <p className="text-xs text-green-600">Target: 25%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
