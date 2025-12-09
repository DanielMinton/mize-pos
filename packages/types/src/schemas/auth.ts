import { z } from "zod";

// Login schemas
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const pinLoginSchema = z.object({
  locationId: z.string().cuid(),
  pin: z.string().length(4, "PIN must be 4 digits").regex(/^\d+$/, "PIN must be numeric"),
});
export type PinLoginInput = z.infer<typeof pinLoginSchema>;

// User schemas
export const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  roleId: z.string().cuid("Invalid role"),
  pin: z
    .string()
    .length(4, "PIN must be 4 digits")
    .regex(/^\d+$/, "PIN must be numeric")
    .optional(),
  phone: z.string().optional(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = createUserSchema.partial().extend({
  id: z.string().cuid(),
  isActive: z.boolean().optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// Role schemas
export const createRoleSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  description: z.string().optional(),
  permissions: z.record(z.boolean()),
  color: z.string().optional(),
  sortOrder: z.number().int().optional(),
});
export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = createRoleSchema.partial().extend({
  id: z.string().cuid(),
});
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

// Session user type
export const sessionUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  organizationId: z.string(),
  roleId: z.string(),
  roleName: z.string(),
  permissions: z.record(z.boolean()),
});
export type SessionUser = z.infer<typeof sessionUserSchema>;
