import { z } from "zod";
import { router, protectedProcedure, createPermissionProcedure } from "../trpc-server";
import { TRPCError } from "@trpc/server";
import { broadcastEightySix } from "@/lib/realtime/event-emitter";
import {
  createMenuSchema,
  updateMenuSchema,
  createCategorySchema,
  updateCategorySchema,
  createMenuItemSchema,
  updateMenuItemSchema,
  createModifierGroupSchema,
  updateModifierGroupSchema,
  createModifierSchema,
  updateModifierSchema,
  linkModifierGroupSchema,
  eightySixSchema,
} from "@mise-pos/types";
import { PERMISSIONS } from "@mise-pos/types";

const menuViewProcedure = createPermissionProcedure(PERMISSIONS.MENU_VIEW);
const menuEditProcedure = createPermissionProcedure(PERMISSIONS.MENU_EDIT);
const menu86Procedure = createPermissionProcedure(PERMISSIONS.MENU_EIGHTY_SIX);

export const menuRouter = router({
  // Get all menus for a location
  getMenus: menuViewProcedure
    .input(z.object({ locationId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.menu.findMany({
        where: { locationId: input.locationId },
        include: {
          categories: {
            include: {
              items: {
                include: {
                  modifierGroups: {
                    include: {
                      modifierGroup: {
                        include: {
                          modifiers: {
                            where: { isActive: true },
                            orderBy: { sortOrder: "asc" },
                          },
                        },
                      },
                    },
                    orderBy: { sortOrder: "asc" },
                  },
                  station: true,
                },
                orderBy: { sortOrder: "asc" },
              },
            },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { sortOrder: "asc" },
      });
    }),

  // Get active menu for POS (includes 86 status)
  getActiveMenu: menuViewProcedure
    .input(z.object({ locationId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTime = `${currentHour.toString().padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}`;
      const currentDay = now.getDay();

      // Get all active menus and filter by time/day
      const menus = await ctx.prisma.menu.findMany({
        where: {
          locationId: input.locationId,
          isActive: true,
        },
        include: {
          categories: {
            include: {
              items: {
                where: { isActive: true },
                include: {
                  modifierGroups: {
                    include: {
                      modifierGroup: {
                        include: {
                          modifiers: {
                            where: { isActive: true },
                            orderBy: { sortOrder: "asc" },
                          },
                        },
                      },
                    },
                    orderBy: { sortOrder: "asc" },
                  },
                  station: true,
                },
                orderBy: { sortOrder: "asc" },
              },
            },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { sortOrder: "asc" },
      });

      // Filter menus by time and day of week
      const applicableMenus = menus.filter((menu) => {
        // Check day of week
        if (menu.daysOfWeek.length > 0 && !menu.daysOfWeek.includes(currentDay)) {
          return false;
        }

        // Check time range
        if (menu.startTime && menu.endTime) {
          if (currentTime < menu.startTime || currentTime > menu.endTime) {
            return false;
          }
        }

        return true;
      });

      // If no time-specific menus, return all active menus
      return applicableMenus.length > 0 ? applicableMenus : menus;
    }),

  // Create menu
  createMenu: menuEditProcedure
    .input(createMenuSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.menu.create({
        data: input,
      });
    }),

  // Update menu
  updateMenu: menuEditProcedure
    .input(updateMenuSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.menu.update({
        where: { id },
        data,
      });
    }),

  // Delete menu
  deleteMenu: menuEditProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.menu.delete({
        where: { id: input.id },
      });
    }),

  // Create category
  createCategory: menuEditProcedure
    .input(createCategorySchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.menuCategory.create({
        data: input,
      });
    }),

  // Update category
  updateCategory: menuEditProcedure
    .input(updateCategorySchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.menuCategory.update({
        where: { id },
        data,
      });
    }),

  // Delete category
  deleteCategory: menuEditProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.menuCategory.delete({
        where: { id: input.id },
      });
    }),

  // Create menu item
  createMenuItem: menuEditProcedure
    .input(createMenuItemSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.menuItem.create({
        data: {
          ...input,
          price: input.price,
          cost: input.cost,
        },
      });
    }),

  // Update menu item
  updateMenuItem: menuEditProcedure
    .input(updateMenuItemSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.menuItem.update({
        where: { id },
        data: {
          ...data,
          price: data.price,
          cost: data.cost,
        },
      });
    }),

  // Delete menu item
  deleteMenuItem: menuEditProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.menuItem.delete({
        where: { id: input.id },
      });
    }),

  // Get modifier groups for a location
  getModifierGroups: menuViewProcedure
    .input(z.object({ locationId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.modifierGroup.findMany({
        where: { locationId: input.locationId },
        include: {
          modifiers: {
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { sortOrder: "asc" },
      });
    }),

  // Create modifier group
  createModifierGroup: menuEditProcedure
    .input(createModifierGroupSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.modifierGroup.create({
        data: input,
      });
    }),

  // Update modifier group
  updateModifierGroup: menuEditProcedure
    .input(updateModifierGroupSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.modifierGroup.update({
        where: { id },
        data,
      });
    }),

  // Delete modifier group
  deleteModifierGroup: menuEditProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.modifierGroup.delete({
        where: { id: input.id },
      });
    }),

  // Create modifier
  createModifier: menuEditProcedure
    .input(createModifierSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.modifier.create({
        data: {
          ...input,
          priceAdjustment: input.priceAdjustment,
        },
      });
    }),

  // Update modifier
  updateModifier: menuEditProcedure
    .input(updateModifierSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.modifier.update({
        where: { id },
        data: {
          ...data,
          priceAdjustment: data.priceAdjustment,
        },
      });
    }),

  // Delete modifier
  deleteModifier: menuEditProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.modifier.delete({
        where: { id: input.id },
      });
    }),

  // Link modifier group to menu item
  linkModifierGroup: menuEditProcedure
    .input(linkModifierGroupSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.menuItemModifierGroup.create({
        data: input,
      });
    }),

  // Unlink modifier group from menu item
  unlinkModifierGroup: menuEditProcedure
    .input(
      z.object({
        menuItemId: z.string().cuid(),
        modifierGroupId: z.string().cuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.menuItemModifierGroup.delete({
        where: {
          menuItemId_modifierGroupId: {
            menuItemId: input.menuItemId,
            modifierGroupId: input.modifierGroupId,
          },
        },
      });
    }),

  // 86 an item
  eightySix: menu86Procedure.input(eightySixSchema).mutation(async ({ ctx, input }) => {
    // Update menu item
    await ctx.prisma.menuItem.update({
      where: { id: input.menuItemId },
      data: { isEightySixed: true },
    });

    // Create 86 record
    const eightySix = await ctx.prisma.eightySix.create({
      data: {
        locationId: input.locationId,
        menuItemId: input.menuItemId,
        reason: input.reason,
        eightySixedById: ctx.user.id,
      },
      include: {
        menuItem: true,
      },
    });

    // Emit real-time event for 86
    await broadcastEightySix(input.locationId, input.menuItemId, true, input.reason, ctx.user.id);

    return eightySix;
  }),

  // Un-86 an item
  unEightySix: menu86Procedure
    .input(
      z.object({
        locationId: z.string().cuid(),
        menuItemId: z.string().cuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Update menu item
      await ctx.prisma.menuItem.update({
        where: { id: input.menuItemId },
        data: { isEightySixed: false },
      });

      // Update latest 86 record
      const latest86 = await ctx.prisma.eightySix.findFirst({
        where: {
          menuItemId: input.menuItemId,
          restoredAt: null,
        },
        orderBy: { eightySixedAt: "desc" },
      });

      if (latest86) {
        await ctx.prisma.eightySix.update({
          where: { id: latest86.id },
          data: { restoredAt: new Date() },
        });
      }

      // Emit real-time event for un-86
      await broadcastEightySix(input.locationId, input.menuItemId, false, undefined, ctx.user.id);

      return { success: true };
    }),

  // Get 86'd items for a location
  getEightySixed: menuViewProcedure
    .input(z.object({ locationId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.eightySix.findMany({
        where: {
          locationId: input.locationId,
          restoredAt: null,
        },
        include: {
          menuItem: true,
          eightySixedBy: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { eightySixedAt: "desc" },
      });
    }),

  // Get stations for a location
  getStations: menuViewProcedure
    .input(z.object({ locationId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.station.findMany({
        where: { locationId: input.locationId },
        orderBy: { sortOrder: "asc" },
      });
    }),
});
