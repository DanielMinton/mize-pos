import { z } from "zod";
import { FreshnessStatus, WasteReason, PurchaseOrderStatus } from "../enums";

// Inventory Item schemas
export const createInventoryItemSchema = z.object({
  locationId: z.string().cuid(),
  name: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  unit: z.string().min(1, "Unit is required"),
  currentStock: z.number().nonnegative().default(0),
  parLevel: z.number().nonnegative().optional(),
  reorderPoint: z.number().nonnegative().optional(),
  reorderQuantity: z.number().positive().optional(),
  unitCost: z.number().nonnegative().default(0),
  shelfLifeDays: z.number().int().positive().optional(),
  storageLocation: z.string().optional(),
  supplierId: z.string().cuid().optional(),
  supplierSku: z.string().optional(),
});
export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;

export const updateInventoryItemSchema = createInventoryItemSchema.partial().extend({
  id: z.string().cuid(),
  isActive: z.boolean().optional(),
});
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;

// Inventory Count schemas
export const recordInventoryCountSchema = z.object({
  inventoryItemId: z.string().cuid(),
  newCount: z.number().nonnegative(),
  notes: z.string().optional(),
});
export type RecordInventoryCountInput = z.infer<typeof recordInventoryCountSchema>;

export const bulkInventoryCountSchema = z.object({
  counts: z.array(recordInventoryCountSchema),
});
export type BulkInventoryCountInput = z.infer<typeof bulkInventoryCountSchema>;

// Freshness Log schemas
export const createFreshnessLogSchema = z.object({
  inventoryItemId: z.string().cuid(),
  batchId: z.string().optional(),
  quantity: z.number().positive(),
  expiresAt: z.string().datetime().optional(),
  status: z.nativeEnum(FreshnessStatus).default("FRESH"),
});
export type CreateFreshnessLogInput = z.infer<typeof createFreshnessLogSchema>;

export const updateFreshnessStatusSchema = z.object({
  id: z.string().cuid(),
  status: z.nativeEnum(FreshnessStatus),
});
export type UpdateFreshnessStatusInput = z.infer<typeof updateFreshnessStatusSchema>;

// Waste Log schemas
export const logWasteSchema = z.object({
  inventoryItemId: z.string().cuid(),
  quantity: z.number().positive("Quantity must be positive"),
  reason: z.nativeEnum(WasteReason),
  notes: z.string().optional(),
});
export type LogWasteInput = z.infer<typeof logWasteSchema>;

// Supplier schemas
export const createSupplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required"),
  contactName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

export const updateSupplierSchema = createSupplierSchema.partial().extend({
  id: z.string().cuid(),
  isActive: z.boolean().optional(),
});
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

// Purchase Order schemas
export const createPurchaseOrderSchema = z.object({
  locationId: z.string().cuid(),
  supplierId: z.string().cuid(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      inventoryItemId: z.string().cuid(),
      quantity: z.number().positive(),
      unitCost: z.number().nonnegative(),
    })
  ),
});
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;

export const updatePurchaseOrderStatusSchema = z.object({
  id: z.string().cuid(),
  status: z.nativeEnum(PurchaseOrderStatus),
});
export type UpdatePurchaseOrderStatusInput = z.infer<typeof updatePurchaseOrderStatusSchema>;

export const receivePurchaseOrderSchema = z.object({
  id: z.string().cuid(),
  items: z.array(
    z.object({
      purchaseOrderItemId: z.string().cuid(),
      receivedQuantity: z.number().nonnegative(),
    })
  ),
});
export type ReceivePurchaseOrderInput = z.infer<typeof receivePurchaseOrderSchema>;

// Recipe schemas
export const createRecipeSchema = z.object({
  menuItemId: z.string().cuid(),
  name: z.string().min(1, "Recipe name is required"),
  description: z.string().optional(),
  yield: z.number().positive().default(1),
  yieldUnit: z.string().default("portion"),
  instructions: z.string().optional(),
  prepTime: z.number().int().positive().optional(),
  cookTime: z.number().int().positive().optional(),
  ingredients: z.array(
    z.object({
      inventoryItemId: z.string().cuid(),
      quantity: z.number().positive(),
      unit: z.string(),
      notes: z.string().optional(),
    })
  ),
});
export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;

export const updateRecipeSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  yield: z.number().positive().optional(),
  yieldUnit: z.string().optional(),
  instructions: z.string().optional().nullable(),
  prepTime: z.number().int().positive().optional().nullable(),
  cookTime: z.number().int().positive().optional().nullable(),
});
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;

export const addRecipeIngredientSchema = z.object({
  recipeId: z.string().cuid(),
  inventoryItemId: z.string().cuid(),
  quantity: z.number().positive(),
  unit: z.string(),
  notes: z.string().optional(),
});
export type AddRecipeIngredientInput = z.infer<typeof addRecipeIngredientSchema>;

export const updateRecipeIngredientSchema = z.object({
  id: z.string().cuid(),
  quantity: z.number().positive().optional(),
  unit: z.string().optional(),
  notes: z.string().optional().nullable(),
});
export type UpdateRecipeIngredientInput = z.infer<typeof updateRecipeIngredientSchema>;

export const removeRecipeIngredientSchema = z.object({
  id: z.string().cuid(),
});
export type RemoveRecipeIngredientInput = z.infer<typeof removeRecipeIngredientSchema>;
