// Application constants
export const APP_NAME = "Mise POS";
export const APP_DESCRIPTION = "Premium, AI-native point-of-sale for hospitality";

// Order configuration
export const MAX_SEATS_PER_TABLE = 20;
export const MAX_COURSES = 10;
export const DEFAULT_TAX_RATE = 0.0825; // 8.25%

// Kitchen timing thresholds (minutes)
export const TICKET_TIMING = {
  NEW: 0, // Blue
  WARNING: 10, // Yellow
  LATE: 15, // Red
  CRITICAL: 20, // Flashing
} as const;

// Ticket colors for KDS
export const TICKET_COLORS = {
  NEW: "#3B82F6", // Blue
  COOKING: "#EAB308", // Yellow
  READY: "#22C55E", // Green
  LATE: "#EF4444", // Red
} as const;

// Inventory categories
export const INVENTORY_CATEGORIES = [
  "Produce",
  "Protein",
  "Seafood",
  "Dairy",
  "Dry Goods",
  "Bakery",
  "Beverage",
  "Alcohol",
  "Paper Goods",
  "Cleaning",
  "Other",
] as const;

// Storage locations
export const STORAGE_LOCATIONS = [
  "Walk-in Cooler",
  "Walk-in Freezer",
  "Dry Storage",
  "Line Cooler",
  "Bar",
  "Prep Area",
] as const;

// Common menu item tags
export const MENU_TAGS = [
  "vegetarian",
  "vegan",
  "gluten-free",
  "dairy-free",
  "nut-free",
  "spicy",
  "chef-special",
  "seasonal",
  "popular",
  "new",
] as const;

// Default stations for a typical restaurant
export const DEFAULT_STATIONS = [
  { name: "Grill", shortName: "GRL", color: "#EF4444" },
  { name: "Sauté", shortName: "SAU", color: "#F97316" },
  { name: "Garde Manger", shortName: "GM", color: "#22C55E" },
  { name: "Fry", shortName: "FRY", color: "#EAB308" },
  { name: "Pastry", shortName: "PST", color: "#EC4899" },
  { name: "Bar", shortName: "BAR", color: "#8B5CF6" },
  { name: "Expo", shortName: "EXP", color: "#6B7280", isExpo: true },
] as const;

// Default table sections
export const DEFAULT_SECTIONS = [
  "Main Dining",
  "Bar",
  "Patio",
  "Private Dining",
] as const;

// Time formats
export const TIME_FORMAT = "h:mm a";
export const DATE_FORMAT = "MMM d, yyyy";
export const DATETIME_FORMAT = "MMM d, yyyy h:mm a";

// Currency formatting
export const CURRENCY_CONFIG = {
  USD: { symbol: "$", decimal: ".", thousands: ",", precision: 2 },
  EUR: { symbol: "€", decimal: ",", thousands: ".", precision: 2 },
  GBP: { symbol: "£", decimal: ".", thousands: ",", precision: 2 },
} as const;

// Keyboard shortcuts for POS
export const POS_SHORTCUTS = {
  SEARCH: "ctrl+f",
  NEW_ORDER: "ctrl+n",
  FIRE_ORDER: "ctrl+enter",
  HOLD_ORDER: "ctrl+h",
  SPLIT_CHECK: "ctrl+s",
  VOID_ITEM: "ctrl+backspace",
  PAYMENT: "ctrl+p",
  CLOSE_ORDER: "ctrl+w",
} as const;

// Audio notification settings
export const AUDIO_CONFIG = {
  NEW_ORDER: "/sounds/new-order.mp3",
  RUSH_ORDER: "/sounds/rush.mp3",
  EIGHTY_SIX: "/sounds/86.mp3",
  ALERT: "/sounds/alert.mp3",
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100,
} as const;
