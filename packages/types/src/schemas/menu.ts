import { z } from "zod";

// Menu schemas
export const createMenuSchema = z.object({
  locationId: z.string().cuid(),
  name: z.string().min(1, "Menu name is required"),
  isActive: z.boolean().default(true),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format").optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format").optional(),
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  sortOrder: z.number().int().optional(),
});
export type CreateMenuInput = z.infer<typeof createMenuSchema>;

export const updateMenuSchema = createMenuSchema.partial().extend({
  id: z.string().cuid(),
});
export type UpdateMenuInput = z.infer<typeof updateMenuSchema>;

// Category schemas
export const createCategorySchema = z.object({
  menuId: z.string().cuid(),
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
  sortOrder: z.number().int().optional(),
  color: z.string().optional(),
  printerId: z.string().cuid().optional(),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial().extend({
  id: z.string().cuid(),
});
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

// MenuItem schemas
export const createMenuItemSchema = z.object({
  categoryId: z.string().cuid(),
  name: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  price: z.number().positive("Price must be positive"),
  cost: z.number().nonnegative().optional(),
  stationId: z.string().cuid().optional(),
  prepTime: z.number().int().positive().optional(),
  imageUrl: z.string().url().optional(),
  color: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().default(true),
  stockCount: z.number().int().nonnegative().optional(),
  calories: z.number().int().nonnegative().optional(),
  allergens: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  printerId: z.string().cuid().optional(),
  kitchenName: z.string().optional(),
});
export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;

export const updateMenuItemSchema = createMenuItemSchema.partial().extend({
  id: z.string().cuid(),
  isEightySixed: z.boolean().optional(),
});
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;

// Modifier Group schemas
export const createModifierGroupSchema = z.object({
  locationId: z.string().cuid(),
  name: z.string().min(1, "Group name is required"),
  displayName: z.string().optional(),
  required: z.boolean().default(false),
  multiSelect: z.boolean().default(false),
  minSelections: z.number().int().nonnegative().default(0),
  maxSelections: z.number().int().positive().optional(),
  sortOrder: z.number().int().optional(),
});
export type CreateModifierGroupInput = z.infer<typeof createModifierGroupSchema>;

export const updateModifierGroupSchema = createModifierGroupSchema.partial().extend({
  id: z.string().cuid(),
});
export type UpdateModifierGroupInput = z.infer<typeof updateModifierGroupSchema>;

// Modifier schemas
export const createModifierSchema = z.object({
  modifierGroupId: z.string().cuid(),
  name: z.string().min(1, "Modifier name is required"),
  shortName: z.string().optional(),
  priceAdjustment: z.number().default(0),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().optional(),
});
export type CreateModifierInput = z.infer<typeof createModifierSchema>;

export const updateModifierSchema = createModifierSchema.partial().extend({
  id: z.string().cuid(),
});
export type UpdateModifierInput = z.infer<typeof updateModifierSchema>;

// Link menu item to modifier group
export const linkModifierGroupSchema = z.object({
  menuItemId: z.string().cuid(),
  modifierGroupId: z.string().cuid(),
  sortOrder: z.number().int().optional(),
  required: z.boolean().optional(),
  minSelections: z.number().int().nonnegative().optional(),
  maxSelections: z.number().int().positive().optional(),
});
export type LinkModifierGroupInput = z.infer<typeof linkModifierGroupSchema>;

// 86 schemas
export const eightySixSchema = z.object({
  locationId: z.string().cuid(),
  menuItemId: z.string().cuid(),
  reason: z.string().optional(),
});
export type EightySixInput = z.infer<typeof eightySixSchema>;
