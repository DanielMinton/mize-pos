// Permission keys - granular access control
export const PERMISSIONS = {
  // Orders
  ORDERS_CREATE: "orders.create",
  ORDERS_VIEW_OWN: "orders.view_own",
  ORDERS_VIEW_ALL: "orders.view_all",
  ORDERS_VOID: "orders.void",
  ORDERS_COMP: "orders.comp",
  ORDERS_DISCOUNT: "orders.discount",
  ORDERS_TRANSFER: "orders.transfer",
  ORDERS_MERGE: "orders.merge",
  ORDERS_SPLIT: "orders.split",

  // Menu
  MENU_VIEW: "menu.view",
  MENU_EDIT: "menu.edit",
  MENU_EIGHTY_SIX: "menu.eightysix",
  MENU_PRICING: "menu.pricing",

  // Kitchen
  KITCHEN_VIEW: "kitchen.view",
  KITCHEN_BUMP: "kitchen.bump",
  KITCHEN_RECALL: "kitchen.recall",
  KITCHEN_PRIORITY: "kitchen.priority",

  // Inventory
  INVENTORY_VIEW: "inventory.view",
  INVENTORY_COUNT: "inventory.count",
  INVENTORY_ADJUST: "inventory.adjust",
  INVENTORY_ORDER: "inventory.order",
  INVENTORY_RECEIVE: "inventory.receive",
  INVENTORY_WASTE: "inventory.waste",
  INVENTORY_RECIPES: "inventory.recipes",

  // Labor
  LABOR_VIEW_OWN: "labor.view_own",
  LABOR_VIEW_ALL: "labor.view_all",
  LABOR_SCHEDULE: "labor.schedule",
  LABOR_CLOCK_OTHERS: "labor.clock_others",
  LABOR_APPROVE_SWAPS: "labor.approve_swaps",

  // Reports
  REPORTS_VIEW: "reports.view",
  REPORTS_SALES: "reports.sales",
  REPORTS_LABOR: "reports.labor",
  REPORTS_INVENTORY: "reports.inventory",
  REPORTS_EXPORT: "reports.export",

  // Admin
  ADMIN_USERS: "admin.users",
  ADMIN_ROLES: "admin.roles",
  ADMIN_SETTINGS: "admin.settings",
  ADMIN_LOCATIONS: "admin.locations",
  ADMIN_PRINTERS: "admin.printers",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Default role templates
export const DEFAULT_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: Object.values(PERMISSIONS),

  manager: [
    PERMISSIONS.ORDERS_CREATE,
    PERMISSIONS.ORDERS_VIEW_ALL,
    PERMISSIONS.ORDERS_VOID,
    PERMISSIONS.ORDERS_COMP,
    PERMISSIONS.ORDERS_DISCOUNT,
    PERMISSIONS.ORDERS_TRANSFER,
    PERMISSIONS.ORDERS_MERGE,
    PERMISSIONS.ORDERS_SPLIT,
    PERMISSIONS.MENU_VIEW,
    PERMISSIONS.MENU_EDIT,
    PERMISSIONS.MENU_EIGHTY_SIX,
    PERMISSIONS.MENU_PRICING,
    PERMISSIONS.KITCHEN_VIEW,
    PERMISSIONS.KITCHEN_BUMP,
    PERMISSIONS.KITCHEN_RECALL,
    PERMISSIONS.KITCHEN_PRIORITY,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_COUNT,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.INVENTORY_ORDER,
    PERMISSIONS.INVENTORY_RECEIVE,
    PERMISSIONS.INVENTORY_WASTE,
    PERMISSIONS.INVENTORY_RECIPES,
    PERMISSIONS.LABOR_VIEW_ALL,
    PERMISSIONS.LABOR_SCHEDULE,
    PERMISSIONS.LABOR_CLOCK_OTHERS,
    PERMISSIONS.LABOR_APPROVE_SWAPS,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_SALES,
    PERMISSIONS.REPORTS_LABOR,
    PERMISSIONS.REPORTS_INVENTORY,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.ADMIN_USERS,
  ],

  server: [
    PERMISSIONS.ORDERS_CREATE,
    PERMISSIONS.ORDERS_VIEW_OWN,
    PERMISSIONS.ORDERS_TRANSFER,
    PERMISSIONS.ORDERS_SPLIT,
    PERMISSIONS.MENU_VIEW,
    PERMISSIONS.MENU_EIGHTY_SIX,
    PERMISSIONS.LABOR_VIEW_OWN,
  ],

  bartender: [
    PERMISSIONS.ORDERS_CREATE,
    PERMISSIONS.ORDERS_VIEW_OWN,
    PERMISSIONS.ORDERS_TRANSFER,
    PERMISSIONS.ORDERS_SPLIT,
    PERMISSIONS.MENU_VIEW,
    PERMISSIONS.MENU_EIGHTY_SIX,
    PERMISSIONS.KITCHEN_VIEW,
    PERMISSIONS.KITCHEN_BUMP,
    PERMISSIONS.LABOR_VIEW_OWN,
    PERMISSIONS.INVENTORY_VIEW,
  ],

  line_cook: [
    PERMISSIONS.MENU_VIEW,
    PERMISSIONS.MENU_EIGHTY_SIX,
    PERMISSIONS.KITCHEN_VIEW,
    PERMISSIONS.KITCHEN_BUMP,
    PERMISSIONS.LABOR_VIEW_OWN,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_WASTE,
  ],

  host: [
    PERMISSIONS.ORDERS_VIEW_ALL,
    PERMISSIONS.MENU_VIEW,
    PERMISSIONS.LABOR_VIEW_OWN,
  ],

  expo: [
    PERMISSIONS.ORDERS_VIEW_ALL,
    PERMISSIONS.MENU_VIEW,
    PERMISSIONS.KITCHEN_VIEW,
    PERMISSIONS.KITCHEN_BUMP,
    PERMISSIONS.KITCHEN_RECALL,
    PERMISSIONS.LABOR_VIEW_OWN,
  ],
};

// Helper to check if a permission object has a specific permission
export function hasPermission(
  permissions: Record<string, boolean> | undefined,
  permission: Permission
): boolean {
  if (!permissions) return false;
  return permissions[permission] === true;
}

// Helper to convert permission array to permission object
export function permissionsArrayToObject(
  permissions: Permission[]
): Record<string, boolean> {
  return permissions.reduce(
    (acc, perm) => {
      acc[perm] = true;
      return acc;
    },
    {} as Record<string, boolean>
  );
}

// Helper to convert permission object to array
export function permissionsObjectToArray(
  permissions: Record<string, boolean>
): Permission[] {
  return Object.entries(permissions)
    .filter(([, value]) => value === true)
    .map(([key]) => key as Permission);
}
