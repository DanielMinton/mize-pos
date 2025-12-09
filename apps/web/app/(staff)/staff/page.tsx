"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { trpc } from "@/lib/api/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  Sparkles,
  Star,
  Clock,
  TrendingUp,
  Utensils,
  DollarSign,
  RefreshCw,
  ChevronRight,
  Lightbulb,
  MessageSquare,
  Award,
} from "lucide-react";

const DEMO_LOCATION_ID = "demo-location-id";

export default function StaffHubPage() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState("briefing");

  // Fetch 86'd items
  const { data: eightySixedItems, isLoading: loading86 } = trpc.menu.getEightySixed.useQuery(
    { locationId: DEMO_LOCATION_ID },
    { enabled: status === "authenticated" }
  );

  // Fetch tip insights
  const { data: tipInsights, isLoading: loadingTips } = trpc.intelligence.getTipInsights.useQuery(
    { locationId: DEMO_LOCATION_ID },
    { enabled: status === "authenticated" }
  );

  // Fetch specials suggestions
  const { data: specials, isLoading: loadingSpecials } = trpc.intelligence.getSuggestions.useQuery(
    { locationId: DEMO_LOCATION_ID, count: 3 },
    { enabled: status === "authenticated" }
  );

  if (status === "loading") {
    return (
      <div className="h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    redirect("/login");
  }

  const isLoading = loading86 || loadingTips || loadingSpecials;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Staff Hub</h1>
            <p className="text-sm text-gray-500">
              Welcome back, {session?.user?.firstName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {eightySixedItems && eightySixedItems.length > 0 && (
              <Badge variant="eighty-six" className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {eightySixedItems.length} 86&apos;d
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="briefing" className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Briefing</span>
            </TabsTrigger>
            <TabsTrigger value="tips" className="flex items-center gap-1">
              <Lightbulb className="w-4 h-4" />
              <span className="hidden sm:inline">Tips</span>
            </TabsTrigger>
            <TabsTrigger value="menu" className="flex items-center gap-1">
              <Utensils className="w-4 h-4" />
              <span className="hidden sm:inline">Menu</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-1">
              <Award className="w-4 h-4" />
              <span className="hidden sm:inline">Stats</span>
            </TabsTrigger>
          </TabsList>

          {/* Daily Briefing Tab */}
          <TabsContent value="briefing" className="space-y-4">
            {/* 86'd Items Alert */}
            {eightySixedItems && eightySixedItems.length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-red-800 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    86&apos;d Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {eightySixedItems.map((item: typeof eightySixedItems[number]) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 bg-white rounded border border-red-100"
                      >
                        <span className="font-medium text-red-900">{item.menuItem.name}</span>
                        <span className="text-sm text-red-600">{item.reason || "Out"}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Today's Specials */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  Today&apos;s Specials
                </CardTitle>
                <CardDescription>Suggested specials based on inventory and trends</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSpecials ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : specials && specials.length > 0 ? (
                  <div className="space-y-3">
                    {specials.map((special: typeof specials[number], index: number) => (
                      <div key={index} className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900">{special.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">{special.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                ${special.suggestedPrice.toFixed(2)}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {special.category}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-amber-700 mt-2 italic">&quot;{special.reasoning}&quot;</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No specials suggested today</p>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Shift Goal</p>
                      <p className="text-2xl font-bold">$1,200</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Expected Covers</p>
                      <p className="text-2xl font-bold">85</p>
                    </div>
                    <Utensils className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tip Insights Tab */}
          <TabsContent value="tips" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  Tip Optimization
                </CardTitle>
                <CardDescription>Research-backed strategies to increase your earnings</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTips ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : tipInsights && tipInsights.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4 pr-4">
                      {tipInsights.map((insight: typeof tipInsights[number], index: number) => (
                        <div key={index} className="p-4 bg-white rounded-lg border">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-green-100 rounded-full">
                              {insight.category === "upselling" && <TrendingUp className="w-4 h-4 text-green-600" />}
                              {insight.category === "personal_connection" && <MessageSquare className="w-4 h-4 text-blue-600" />}
                              {insight.category === "timing" && <Clock className="w-4 h-4 text-purple-600" />}
                              {insight.category === "check_presentation" && <DollarSign className="w-4 h-4 text-amber-600" />}
                              {insight.category === "body_language" && <Star className="w-4 h-4 text-pink-600" />}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                              <p className="text-sm text-gray-600 mt-1">{insight.content}</p>
                              {insight.expectedImpact && (
                                <Badge variant="outline" className="mt-2 text-xs text-green-600">
                                  {insight.expectedImpact}
                                </Badge>
                              )}
                              {insight.researchSource && (
                                <p className="text-xs text-gray-400 mt-1">Source: {insight.researchSource}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-gray-500 text-center py-4">No insights available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Menu Knowledge Tab */}
          <TabsContent value="menu" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-blue-500" />
                  Menu Knowledge
                </CardTitle>
                <CardDescription>Item details, pairings, and selling points</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-between">
                    <span>Best Sellers</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" className="w-full justify-between">
                    <span>Wine Pairings</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" className="w-full justify-between">
                    <span>Allergen Guide</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" className="w-full justify-between">
                    <span>Ingredient Sources</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  Your Performance
                </CardTitle>
                <CardDescription>Track your sales and service metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">This Week</p>
                    <p className="text-2xl font-bold text-gray-900">$3,450</p>
                    <p className="text-xs text-green-600">+12% vs last week</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Avg Check</p>
                    <p className="text-2xl font-bold text-gray-900">$68.50</p>
                    <p className="text-xs text-green-600">+$4.20 vs team avg</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Tip %</p>
                    <p className="text-2xl font-bold text-gray-900">21.3%</p>
                    <p className="text-xs text-green-600">Top 10%</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Tables Served</p>
                    <p className="text-2xl font-bold text-gray-900">42</p>
                    <p className="text-xs text-gray-500">This week</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Leaderboard Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Weekly Leaderboard</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { rank: 1, name: "Sarah M.", sales: 4200 },
                    { rank: 2, name: "You", sales: 3450, isYou: true },
                    { rank: 3, name: "Mike T.", sales: 3100 },
                  ].map((entry: { rank: number; name: string; sales: number; isYou?: boolean }) => (
                    <div
                      key={entry.rank}
                      className={`flex items-center justify-between p-2 rounded ${
                        entry.isYou ? "bg-primary/10" : "bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 flex items-center justify-center bg-white rounded-full text-sm font-bold">
                          {entry.rank}
                        </span>
                        <span className={entry.isYou ? "font-semibold" : ""}>{entry.name}</span>
                      </div>
                      <span className="text-sm text-gray-600">${entry.sales.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
