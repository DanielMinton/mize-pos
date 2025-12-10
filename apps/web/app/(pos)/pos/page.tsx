"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { MenuGrid, CategoryTabs, OrderSidebar, ModifierModal, QuickActionsBar } from "@/components/pos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { OfflineIndicator } from "@/components/ui/offline-indicator";
import { trpc } from "@/lib/api/trpc";
import { useOrderStore, usePOSStore, useQuickActionsStore } from "@/lib/stores";
import { toast } from "@/lib/hooks/use-toast";
import {
  Search,
  Menu as MenuIcon,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

// For demo purposes - in production this would come from context/route
const DEMO_LOCATION_ID = "demo-location-id";

export default function POSPage() {
  const { data: session, status } = useSession();
  const [isModifierModalOpen, setIsModifierModalOpen] = useState(false);

  const {
    currentOrder,
    modifierSelection,
    openModifierSelection,
    closeModifierSelection,
    confirmItemAddition,
    startNewOrder,
    addItemToOrder,
  } = useOrderStore();

  const {
    searchQuery,
    setSearchQuery,
    setEightySixedItems,
  } = usePOSStore();

  const { addRecentItem, lastOrderItems, setLastOrder } = useQuickActionsStore();

  // Fetch menu data
  const { data: menus, isLoading: menusLoading } = trpc.menu.getActiveMenu.useQuery(
    { locationId: DEMO_LOCATION_ID },
    { enabled: status === "authenticated" }
  );

  // Fetch 86'd items
  const { data: eightySixedData } = trpc.menu.getEightySixed.useQuery(
    { locationId: DEMO_LOCATION_ID },
    { enabled: status === "authenticated" }
  );

  // Mutations
  const createOrderMutation = trpc.order.createOrder.useMutation();
  const addItemMutation = trpc.order.addItem.useMutation();
  const fireOrderMutation = trpc.order.fireOrder.useMutation();
  const holdItemsMutation = trpc.order.holdItems.useMutation();
  const removeItemMutation = trpc.order.removeItem.useMutation();

  // Update 86'd items in store
  useEffect(() => {
    if (eightySixedData) {
      setEightySixedItems(eightySixedData.map((e: typeof eightySixedData[number]) => e.menuItemId));
    }
  }, [eightySixedData, setEightySixedItems]);

  // Start a new order if none exists (demo)
  useEffect(() => {
    if (!currentOrder && status === "authenticated") {
      startNewOrder({
        guestCount: 2,
        type: "DINE_IN",
        tableName: "Table 1",
      });
    }
  }, [currentOrder, status, startNewOrder]);

  if (status === "loading" || menusLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    redirect("/login");
  }

  // Flatten categories from all menus
  const categories =
    menus?.flatMap((menu: typeof menus[number]) =>
      menu.categories.map((cat: typeof menu.categories[number]) => ({
        id: cat.id,
        name: cat.name,
        color: cat.color,
        itemCount: cat.items.length,
        items: cat.items.map((item: typeof cat.items[number]) => ({
          ...item,
          price: Number(item.price),
          modifierGroups: item.modifierGroups.map((mg: typeof item.modifierGroups[number]) => ({
            ...mg,
            modifierGroup: {
              ...mg.modifierGroup,
              modifiers: mg.modifierGroup.modifiers.map((mod: typeof mg.modifierGroup.modifiers[number]) => ({
                ...mod,
                priceAdjustment: Number(mod.priceAdjustment),
              })),
            },
          })),
        })),
      }))
    ) || [];

  const handleItemClick = (item: (typeof categories)[0]["items"][0]) => {
    if (item.isEightySixed) return;

    if (item.modifierGroups.length > 0) {
      openModifierSelection(item as never);
      setIsModifierModalOpen(true);
    } else {
      // No modifiers, add directly
      handleAddItemDirectly(item);
    }
  };

  const handleAddItemDirectly = async (item: (typeof categories)[0]["items"][0], categoryName?: string) => {
    if (!currentOrder) return;

    try {
      // Create order if needed
      let orderId = currentOrder.id;

      if (!orderId && session?.user) {
        const newOrder = await createOrderMutation.mutateAsync({
          locationId: DEMO_LOCATION_ID,
          type: currentOrder.type,
          guestCount: currentOrder.guestCount,
          serverId: session.user.id,
          tableId: currentOrder.tableId,
          tabName: currentOrder.tabName,
        });
        orderId = newOrder.id;
      }

      if (!orderId) return;

      const newItem = await addItemMutation.mutateAsync({
        orderId,
        menuItemId: item.id,
        quantity: 1,
        seat: 1,
        course: 1,
      });

      addItemToOrder(newItem as never);

      // Track in recent items
      addRecentItem({
        id: crypto.randomUUID(),
        menuItemId: item.id,
        name: item.name,
        price: Number(item.price),
        categoryName: categoryName || "Menu",
        hasModifiers: item.modifierGroups.length > 0,
      });

      toast({
        title: "Item added",
        description: `${item.name} added to order`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add item",
        variant: "destructive",
      });
    }
  };

  const handleConfirmModifiers = async () => {
    const itemData = confirmItemAddition();
    if (!itemData || !currentOrder || !modifierSelection) return;

    try {
      let orderId = currentOrder.id;

      if (!orderId && session?.user) {
        const newOrder = await createOrderMutation.mutateAsync({
          locationId: DEMO_LOCATION_ID,
          type: currentOrder.type,
          guestCount: currentOrder.guestCount,
          serverId: session.user.id,
          tableId: currentOrder.tableId,
          tabName: currentOrder.tabName,
        });
        orderId = newOrder.id;
      }

      if (!orderId) return;

      const newItem = await addItemMutation.mutateAsync({
        orderId,
        ...itemData,
      });

      addItemToOrder(newItem as never);

      // Track in recent items
      addRecentItem({
        id: crypto.randomUUID(),
        menuItemId: modifierSelection.menuItem.id,
        name: modifierSelection.menuItem.name,
        price: Number(modifierSelection.menuItem.price),
        categoryName: "Menu",
        hasModifiers: true,
      });

      setIsModifierModalOpen(false);

      toast({
        title: "Item added",
        description: "Item added with modifiers",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add item",
        variant: "destructive",
      });
    }
  };

  const handleFireOrder = async () => {
    if (!currentOrder?.id) return;

    try {
      await fireOrderMutation.mutateAsync({
        orderId: currentOrder.id,
      });

      toast({
        title: "Order fired",
        description: "Order sent to kitchen",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fire order",
        variant: "destructive",
      });
    }
  };

  const handleHoldItems = async (itemIds: string[]) => {
    try {
      await holdItemsMutation.mutateAsync({ orderItemIds: itemIds });

      toast({
        title: "Items held",
        description: `${itemIds.length} item(s) held`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to hold items",
        variant: "destructive",
      });
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await removeItemMutation.mutateAsync({ orderItemId: itemId });

      toast({
        title: "Item removed",
        description: "Item removed from order",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove item",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b px-4 py-2 flex items-center gap-4">
        <h1 className="text-xl font-bold text-primary">MisePOS</h1>

        {/* Search */}
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search menu..."
            className="pl-10"
          />
        </div>

        {/* 86 Alert */}
        {eightySixedData && eightySixedData.length > 0 && (
          <Badge variant="eighty-six" className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {eightySixedData.length} items 86&apos;d
          </Badge>
        )}

        {/* Offline Indicator */}
        <OfflineIndicator showSyncButton={false} />

        {/* Theme Toggle */}
        <ThemeToggle variant="icon" />

        {/* User */}
        <div className="text-sm text-muted-foreground">
          {session?.user?.firstName} {session?.user?.lastName?.charAt(0)}.
        </div>
      </header>

      {/* Category Tabs */}
      <CategoryTabs
        categories={categories.map((c: typeof categories[number]) => ({
          id: c.id,
          name: c.name,
          color: c.color,
          itemCount: c.itemCount,
        }))}
      />

      {/* Quick Actions Bar */}
      <QuickActionsBar
        onItemClick={(quickItem) => {
          // Find the full item data from categories
          for (const cat of categories) {
            const item = cat.items.find((i: typeof cat.items[number]) => i.id === quickItem.menuItemId);
            if (item) {
              if (quickItem.hasModifiers) {
                openModifierSelection(item as never);
                setIsModifierModalOpen(true);
              } else {
                handleAddItemDirectly(item, cat.name);
              }
              return;
            }
          }
        }}
        onRepeatLast={() => {
          // Add all items from last order
          lastOrderItems.forEach((quickItem) => {
            for (const cat of categories) {
              const item = cat.items.find((i: typeof cat.items[number]) => i.id === quickItem.menuItemId);
              if (item && !item.isEightySixed) {
                if (!quickItem.hasModifiers) {
                  handleAddItemDirectly(item, cat.name);
                }
                break;
              }
            }
          });
        }}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Menu Grid */}
        <ScrollArea className="flex-1">
          <MenuGrid categories={categories} onItemClick={handleItemClick} />
        </ScrollArea>

        {/* Order Sidebar */}
        <OrderSidebar
          onFireOrder={handleFireOrder}
          onHoldItems={handleHoldItems}
          onRemoveItem={handleRemoveItem}
          onCloseOrder={() => {}}
          onPayment={() => {}}
          onSplitCheck={() => {}}
          isSubmitting={
            createOrderMutation.isPending ||
            addItemMutation.isPending ||
            fireOrderMutation.isPending
          }
        />
      </div>

      {/* Modifier Modal */}
      <ModifierModal
        open={isModifierModalOpen}
        onOpenChange={setIsModifierModalOpen}
        onConfirm={handleConfirmModifiers}
      />
    </div>
  );
}
