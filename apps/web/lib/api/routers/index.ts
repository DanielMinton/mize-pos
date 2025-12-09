import { router } from "../trpc-server";
import { menuRouter } from "./menu";
import { orderRouter } from "./order";
import { kitchenRouter } from "./kitchen";
import { inventoryRouter } from "./inventory";
import { laborRouter } from "./labor";
import { reportsRouter } from "./reports";

export const appRouter = router({
  menu: menuRouter,
  order: orderRouter,
  kitchen: kitchenRouter,
  inventory: inventoryRouter,
  labor: laborRouter,
  reports: reportsRouter,
});

export type AppRouter = typeof appRouter;
