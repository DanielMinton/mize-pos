import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // Clean up existing data
  console.log("  Cleaning existing data...");
  await prisma.orderItemModifier.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.void.deleteMany();
  await prisma.comp.deleteMany();
  await prisma.discount.deleteMany();
  await prisma.check.deleteMany();
  await prisma.order.deleteMany();
  await prisma.eightySix.deleteMany();
  await prisma.menuItemModifierGroup.deleteMany();
  await prisma.modifier.deleteMany();
  await prisma.modifierGroup.deleteMany();
  await prisma.recipeIngredient.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.menuCategory.deleteMany();
  await prisma.menu.deleteMany();
  await prisma.inventoryCount.deleteMany();
  await prisma.freshnessLog.deleteMany();
  await prisma.wasteLog.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.prepTask.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.break.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.table.deleteMany();
  await prisma.printer.deleteMany();
  await prisma.station.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.location.deleteMany();
  await prisma.organizationSettings.deleteMany();
  await prisma.organization.deleteMany();

  // Create Organization
  console.log("  Creating organization...");
  const org = await prisma.organization.create({
    data: {
      name: "The Modern Kitchen",
      slug: "modern-kitchen",
    },
  });

  // Create Organization Settings
  await prisma.organizationSettings.create({
    data: {
      organizationId: org.id,
      timezone: "America/New_York",
      currency: "USD",
      taxRate: 0.0825,
    },
  });

  // Create Location
  console.log("  Creating location...");
  const location = await prisma.location.create({
    data: {
      organizationId: org.id,
      name: "Main Street Location",
      address: "123 Main Street",
      city: "New York",
      state: "NY",
      zipCode: "10001",
      phone: "(212) 555-0100",
    },
  });

  // Create Roles
  console.log("  Creating roles...");
  const adminRole = await prisma.role.create({
    data: {
      organizationId: org.id,
      name: "Admin",
      description: "Full system access",
      permissions: {
        "orders.create": true,
        "orders.view_own": true,
        "orders.view_all": true,
        "orders.void": true,
        "orders.comp": true,
        "orders.discount": true,
        "orders.transfer": true,
        "orders.merge": true,
        "orders.split": true,
        "menu.view": true,
        "menu.edit": true,
        "menu.eightysix": true,
        "menu.pricing": true,
        "kitchen.view": true,
        "kitchen.bump": true,
        "kitchen.recall": true,
        "kitchen.priority": true,
        "inventory.view": true,
        "inventory.count": true,
        "inventory.adjust": true,
        "inventory.order": true,
        "inventory.receive": true,
        "inventory.waste": true,
        "inventory.recipes": true,
        "labor.view_own": true,
        "labor.view_all": true,
        "labor.schedule": true,
        "labor.clock_others": true,
        "labor.approve_swaps": true,
        "reports.view": true,
        "reports.sales": true,
        "reports.labor": true,
        "reports.inventory": true,
        "reports.export": true,
        "admin.users": true,
        "admin.roles": true,
        "admin.settings": true,
        "admin.locations": true,
        "admin.printers": true,
      },
      color: "#EF4444",
      sortOrder: 0,
    },
  });

  const managerRole = await prisma.role.create({
    data: {
      organizationId: org.id,
      name: "Manager",
      description: "Management access",
      permissions: {
        "orders.create": true,
        "orders.view_own": true,
        "orders.view_all": true,
        "orders.void": true,
        "orders.comp": true,
        "orders.discount": true,
        "orders.transfer": true,
        "orders.merge": true,
        "orders.split": true,
        "menu.view": true,
        "menu.edit": true,
        "menu.eightysix": true,
        "kitchen.view": true,
        "kitchen.bump": true,
        "kitchen.recall": true,
        "inventory.view": true,
        "inventory.count": true,
        "inventory.waste": true,
        "labor.view_own": true,
        "labor.view_all": true,
        "labor.schedule": true,
        "reports.view": true,
        "reports.sales": true,
        "reports.labor": true,
      },
      color: "#3B82F6",
      sortOrder: 1,
    },
  });

  const serverRole = await prisma.role.create({
    data: {
      organizationId: org.id,
      name: "Server",
      description: "Front of house server",
      permissions: {
        "orders.create": true,
        "orders.view_own": true,
        "orders.transfer": true,
        "orders.split": true,
        "menu.view": true,
        "menu.eightysix": true,
        "labor.view_own": true,
      },
      color: "#22C55E",
      sortOrder: 2,
    },
  });

  const bartenderRole = await prisma.role.create({
    data: {
      organizationId: org.id,
      name: "Bartender",
      description: "Bar service",
      permissions: {
        "orders.create": true,
        "orders.view_own": true,
        "orders.transfer": true,
        "orders.split": true,
        "menu.view": true,
        "menu.eightysix": true,
        "kitchen.view": true,
        "kitchen.bump": true,
        "inventory.view": true,
        "labor.view_own": true,
      },
      color: "#8B5CF6",
      sortOrder: 3,
    },
  });

  const lineCookRole = await prisma.role.create({
    data: {
      organizationId: org.id,
      name: "Line Cook",
      description: "Kitchen staff",
      permissions: {
        "menu.view": true,
        "menu.eightysix": true,
        "kitchen.view": true,
        "kitchen.bump": true,
        "inventory.view": true,
        "inventory.waste": true,
        "labor.view_own": true,
      },
      color: "#F97316",
      sortOrder: 4,
    },
  });

  // Create Users
  console.log("  Creating users...");
  const hashedPassword = await hash("password123", 10);

  const adminUser = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: "admin@modernkitchen.com",
      passwordHash: hashedPassword,
      firstName: "Alex",
      lastName: "Admin",
      pin: "1234",
      roleId: adminRole.id,
    },
  });

  const managerUser = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: "manager@modernkitchen.com",
      passwordHash: hashedPassword,
      firstName: "Morgan",
      lastName: "Manager",
      pin: "2345",
      roleId: managerRole.id,
    },
  });

  const serverUser = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: "sam@modernkitchen.com",
      passwordHash: hashedPassword,
      firstName: "Sam",
      lastName: "Server",
      pin: "3456",
      roleId: serverRole.id,
    },
  });

  const bartenderUser = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: "bailey@modernkitchen.com",
      passwordHash: hashedPassword,
      firstName: "Bailey",
      lastName: "Bartender",
      pin: "4567",
      roleId: bartenderRole.id,
    },
  });

  const cookUser = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: "chris@modernkitchen.com",
      passwordHash: hashedPassword,
      firstName: "Chris",
      lastName: "Cook",
      pin: "5678",
      roleId: lineCookRole.id,
    },
  });

  // Create Stations
  console.log("  Creating stations...");
  const grillStation = await prisma.station.create({
    data: {
      locationId: location.id,
      name: "Grill",
      shortName: "GRL",
      color: "#EF4444",
      sortOrder: 0,
    },
  });

  const sauteStation = await prisma.station.create({
    data: {
      locationId: location.id,
      name: "Sauté",
      shortName: "SAU",
      color: "#F97316",
      sortOrder: 1,
    },
  });

  const gmStation = await prisma.station.create({
    data: {
      locationId: location.id,
      name: "Garde Manger",
      shortName: "GM",
      color: "#22C55E",
      sortOrder: 2,
    },
  });

  const fryStation = await prisma.station.create({
    data: {
      locationId: location.id,
      name: "Fry",
      shortName: "FRY",
      color: "#EAB308",
      sortOrder: 3,
    },
  });

  const pastryStation = await prisma.station.create({
    data: {
      locationId: location.id,
      name: "Pastry",
      shortName: "PST",
      color: "#EC4899",
      sortOrder: 4,
    },
  });

  const barStation = await prisma.station.create({
    data: {
      locationId: location.id,
      name: "Bar",
      shortName: "BAR",
      color: "#8B5CF6",
      sortOrder: 5,
    },
  });

  const expoStation = await prisma.station.create({
    data: {
      locationId: location.id,
      name: "Expo",
      shortName: "EXP",
      color: "#6B7280",
      sortOrder: 6,
      isExpo: true,
    },
  });

  // Create Tables
  console.log("  Creating tables...");
  for (let i = 1; i <= 12; i++) {
    await prisma.table.create({
      data: {
        locationId: location.id,
        name: `Table ${i}`,
        section: i <= 6 ? "Main Dining" : "Patio",
        capacity: i <= 8 ? 4 : 6,
      },
    });
  }

  for (let i = 1; i <= 6; i++) {
    await prisma.table.create({
      data: {
        locationId: location.id,
        name: `Bar ${i}`,
        section: "Bar",
        capacity: 2,
      },
    });
  }

  // Create Menu
  console.log("  Creating menu...");
  const dinnerMenu = await prisma.menu.create({
    data: {
      locationId: location.id,
      name: "Dinner",
      isActive: true,
      startTime: "17:00",
      endTime: "22:00",
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      sortOrder: 0,
    },
  });

  // Modifier Groups
  console.log("  Creating modifier groups...");
  const tempGroup = await prisma.modifierGroup.create({
    data: {
      locationId: location.id,
      name: "Temperature",
      displayName: "How would you like that cooked?",
      required: true,
      multiSelect: false,
      minSelections: 1,
      sortOrder: 0,
    },
  });

  await prisma.modifier.createMany({
    data: [
      { modifierGroupId: tempGroup.id, name: "Rare", shortName: "R", sortOrder: 0 },
      { modifierGroupId: tempGroup.id, name: "Medium Rare", shortName: "MR", sortOrder: 1, isDefault: true },
      { modifierGroupId: tempGroup.id, name: "Medium", shortName: "M", sortOrder: 2 },
      { modifierGroupId: tempGroup.id, name: "Medium Well", shortName: "MW", sortOrder: 3 },
      { modifierGroupId: tempGroup.id, name: "Well Done", shortName: "WD", sortOrder: 4 },
    ],
  });

  const sidesGroup = await prisma.modifierGroup.create({
    data: {
      locationId: location.id,
      name: "Sides",
      displayName: "Choose your side",
      required: true,
      multiSelect: false,
      minSelections: 1,
      sortOrder: 1,
    },
  });

  await prisma.modifier.createMany({
    data: [
      { modifierGroupId: sidesGroup.id, name: "Fries", shortName: "FRIES", sortOrder: 0, isDefault: true },
      { modifierGroupId: sidesGroup.id, name: "Mashed Potatoes", shortName: "MASH", sortOrder: 1 },
      { modifierGroupId: sidesGroup.id, name: "Seasonal Vegetables", shortName: "VEG", sortOrder: 2 },
      { modifierGroupId: sidesGroup.id, name: "House Salad", shortName: "SALAD", sortOrder: 3 },
      { modifierGroupId: sidesGroup.id, name: "Sweet Potato Fries", shortName: "SWFRY", priceAdjustment: 2, sortOrder: 4 },
    ],
  });

  const addOnsGroup = await prisma.modifierGroup.create({
    data: {
      locationId: location.id,
      name: "Add-Ons",
      displayName: "Extras",
      required: false,
      multiSelect: true,
      minSelections: 0,
      maxSelections: 5,
      sortOrder: 2,
    },
  });

  await prisma.modifier.createMany({
    data: [
      { modifierGroupId: addOnsGroup.id, name: "Add Bacon", shortName: "+BACON", priceAdjustment: 3, sortOrder: 0 },
      { modifierGroupId: addOnsGroup.id, name: "Add Cheese", shortName: "+CHEESE", priceAdjustment: 2, sortOrder: 1 },
      { modifierGroupId: addOnsGroup.id, name: "Add Egg", shortName: "+EGG", priceAdjustment: 2, sortOrder: 2 },
      { modifierGroupId: addOnsGroup.id, name: "Add Avocado", shortName: "+AVO", priceAdjustment: 3, sortOrder: 3 },
      { modifierGroupId: addOnsGroup.id, name: "Extra Sauce", shortName: "+SAUCE", priceAdjustment: 1, sortOrder: 4 },
    ],
  });

  const dressingGroup = await prisma.modifierGroup.create({
    data: {
      locationId: location.id,
      name: "Dressings",
      displayName: "Choose your dressing",
      required: true,
      multiSelect: false,
      minSelections: 1,
      sortOrder: 3,
    },
  });

  await prisma.modifier.createMany({
    data: [
      { modifierGroupId: dressingGroup.id, name: "Ranch", shortName: "RANCH", sortOrder: 0, isDefault: true },
      { modifierGroupId: dressingGroup.id, name: "Caesar", shortName: "CAES", sortOrder: 1 },
      { modifierGroupId: dressingGroup.id, name: "Balsamic", shortName: "BALS", sortOrder: 2 },
      { modifierGroupId: dressingGroup.id, name: "Blue Cheese", shortName: "BLUE", sortOrder: 3 },
      { modifierGroupId: dressingGroup.id, name: "Oil & Vinegar", shortName: "O&V", sortOrder: 4 },
    ],
  });

  // Categories and Items
  console.log("  Creating menu categories and items...");

  // Appetizers
  const appetizersCat = await prisma.menuCategory.create({
    data: {
      menuId: dinnerMenu.id,
      name: "Appetizers",
      color: "#22C55E",
      sortOrder: 0,
    },
  });

  await prisma.menuItem.create({
    data: {
      categoryId: appetizersCat.id,
      name: "Crispy Calamari",
      description: "Flash-fried calamari with marinara and lemon aioli",
      price: 16,
      stationId: fryStation.id,
      prepTime: 8,
      allergens: ["shellfish", "gluten"],
      tags: [],
      sortOrder: 0,
    },
  });

  await prisma.menuItem.create({
    data: {
      categoryId: appetizersCat.id,
      name: "Burrata",
      description: "Fresh burrata, heirloom tomatoes, basil, balsamic reduction",
      price: 18,
      stationId: gmStation.id,
      prepTime: 5,
      allergens: ["dairy"],
      tags: ["vegetarian"],
      sortOrder: 1,
    },
  });

  await prisma.menuItem.create({
    data: {
      categoryId: appetizersCat.id,
      name: "Wings",
      description: "Crispy chicken wings, choice of buffalo or BBQ",
      price: 14,
      stationId: fryStation.id,
      prepTime: 12,
      allergens: [],
      tags: ["spicy"],
      sortOrder: 2,
    },
  });

  const caesarItem = await prisma.menuItem.create({
    data: {
      categoryId: appetizersCat.id,
      name: "Caesar Salad",
      description: "Romaine, parmesan, croutons, house-made caesar dressing",
      price: 12,
      stationId: gmStation.id,
      prepTime: 5,
      allergens: ["dairy", "gluten", "eggs"],
      tags: ["vegetarian"],
      sortOrder: 3,
    },
  });

  await prisma.menuItemModifierGroup.create({
    data: {
      menuItemId: caesarItem.id,
      modifierGroupId: addOnsGroup.id,
      sortOrder: 0,
    },
  });

  await prisma.menuItem.create({
    data: {
      categoryId: appetizersCat.id,
      name: "Soup of the Day",
      description: "Ask your server for today's selection",
      price: 9,
      stationId: sauteStation.id,
      prepTime: 3,
      allergens: [],
      tags: [],
      sortOrder: 4,
    },
  });

  // Entrees
  const entreesCat = await prisma.menuCategory.create({
    data: {
      menuId: dinnerMenu.id,
      name: "Entrees",
      color: "#EF4444",
      sortOrder: 1,
    },
  });

  const ribeye = await prisma.menuItem.create({
    data: {
      categoryId: entreesCat.id,
      name: "Ribeye Steak",
      description: "14oz prime ribeye, herb butter, choice of side",
      price: 48,
      stationId: grillStation.id,
      prepTime: 18,
      allergens: ["dairy"],
      tags: [],
      kitchenName: "RIBEYE",
      sortOrder: 0,
    },
  });

  await prisma.menuItemModifierGroup.createMany({
    data: [
      { menuItemId: ribeye.id, modifierGroupId: tempGroup.id, sortOrder: 0 },
      { menuItemId: ribeye.id, modifierGroupId: sidesGroup.id, sortOrder: 1 },
      { menuItemId: ribeye.id, modifierGroupId: addOnsGroup.id, sortOrder: 2 },
    ],
  });

  const salmon = await prisma.menuItem.create({
    data: {
      categoryId: entreesCat.id,
      name: "Atlantic Salmon",
      description: "Pan-seared salmon, lemon caper butter, seasonal vegetables",
      price: 32,
      stationId: sauteStation.id,
      prepTime: 15,
      allergens: ["fish", "dairy"],
      tags: [],
      kitchenName: "SALMON",
      sortOrder: 1,
    },
  });

  await prisma.menuItemModifierGroup.create({
    data: {
      menuItemId: salmon.id,
      modifierGroupId: sidesGroup.id,
      sortOrder: 0,
    },
  });

  const burger = await prisma.menuItem.create({
    data: {
      categoryId: entreesCat.id,
      name: "Classic Burger",
      description: "8oz Angus beef, lettuce, tomato, onion, brioche bun, fries",
      price: 19,
      stationId: grillStation.id,
      prepTime: 12,
      allergens: ["gluten", "dairy"],
      tags: ["popular"],
      kitchenName: "BURGER",
      sortOrder: 2,
    },
  });

  await prisma.menuItemModifierGroup.createMany({
    data: [
      { menuItemId: burger.id, modifierGroupId: tempGroup.id, sortOrder: 0 },
      { menuItemId: burger.id, modifierGroupId: addOnsGroup.id, sortOrder: 1 },
    ],
  });

  const chicken = await prisma.menuItem.create({
    data: {
      categoryId: entreesCat.id,
      name: "Roasted Chicken",
      description: "Half chicken, garlic herb jus, mashed potatoes",
      price: 26,
      stationId: grillStation.id,
      prepTime: 20,
      allergens: ["dairy"],
      tags: [],
      kitchenName: "CHICKEN",
      sortOrder: 3,
    },
  });

  await prisma.menuItemModifierGroup.create({
    data: {
      menuItemId: chicken.id,
      modifierGroupId: sidesGroup.id,
      sortOrder: 0,
    },
  });

  await prisma.menuItem.create({
    data: {
      categoryId: entreesCat.id,
      name: "Pasta Primavera",
      description: "Penne, seasonal vegetables, garlic cream sauce",
      price: 22,
      stationId: sauteStation.id,
      prepTime: 12,
      allergens: ["gluten", "dairy"],
      tags: ["vegetarian"],
      kitchenName: "PRIMAVERA",
      sortOrder: 4,
    },
  });

  await prisma.menuItem.create({
    data: {
      categoryId: entreesCat.id,
      name: "Fish & Chips",
      description: "Beer-battered cod, fries, tartar sauce, coleslaw",
      price: 24,
      stationId: fryStation.id,
      prepTime: 14,
      allergens: ["fish", "gluten"],
      tags: [],
      kitchenName: "FISH CHIPS",
      sortOrder: 5,
    },
  });

  const filet = await prisma.menuItem.create({
    data: {
      categoryId: entreesCat.id,
      name: "Filet Mignon",
      description: "8oz center-cut filet, truffle butter, asparagus",
      price: 52,
      stationId: grillStation.id,
      prepTime: 18,
      allergens: ["dairy"],
      tags: ["chef-special"],
      kitchenName: "FILET",
      sortOrder: 6,
    },
  });

  await prisma.menuItemModifierGroup.createMany({
    data: [
      { menuItemId: filet.id, modifierGroupId: tempGroup.id, sortOrder: 0 },
      { menuItemId: filet.id, modifierGroupId: sidesGroup.id, sortOrder: 1 },
    ],
  });

  await prisma.menuItem.create({
    data: {
      categoryId: entreesCat.id,
      name: "Lobster Risotto",
      description: "Maine lobster, saffron arborio, parmesan",
      price: 42,
      stationId: sauteStation.id,
      prepTime: 20,
      allergens: ["shellfish", "dairy"],
      tags: ["chef-special"],
      kitchenName: "LOB RISOTTO",
      sortOrder: 7,
    },
  });

  // Desserts
  const dessertsCat = await prisma.menuCategory.create({
    data: {
      menuId: dinnerMenu.id,
      name: "Desserts",
      color: "#EC4899",
      sortOrder: 2,
    },
  });

  await prisma.menuItem.create({
    data: {
      categoryId: dessertsCat.id,
      name: "Chocolate Lava Cake",
      description: "Warm chocolate cake, molten center, vanilla ice cream",
      price: 12,
      stationId: pastryStation.id,
      prepTime: 15,
      allergens: ["dairy", "eggs", "gluten"],
      tags: ["popular"],
      sortOrder: 0,
    },
  });

  await prisma.menuItem.create({
    data: {
      categoryId: dessertsCat.id,
      name: "Crème Brûlée",
      description: "Classic vanilla custard, caramelized sugar",
      price: 10,
      stationId: pastryStation.id,
      prepTime: 5,
      allergens: ["dairy", "eggs"],
      tags: [],
      sortOrder: 1,
    },
  });

  await prisma.menuItem.create({
    data: {
      categoryId: dessertsCat.id,
      name: "New York Cheesecake",
      description: "Classic cheesecake, berry compote",
      price: 11,
      stationId: pastryStation.id,
      prepTime: 3,
      allergens: ["dairy", "eggs", "gluten"],
      tags: [],
      sortOrder: 2,
    },
  });

  // Beer
  const beerCat = await prisma.menuCategory.create({
    data: {
      menuId: dinnerMenu.id,
      name: "Beer",
      color: "#EAB308",
      sortOrder: 3,
    },
  });

  const beers = [
    { name: "IPA", price: 8, description: "Local craft IPA, hoppy and citrus notes" },
    { name: "Pilsner", price: 7, description: "Crisp German-style pilsner" },
    { name: "Stout", price: 8, description: "Rich chocolate and coffee notes" },
    { name: "Wheat", price: 7, description: "Belgian-style wheat ale, citrus finish" },
    { name: "Amber Ale", price: 7, description: "Balanced malt character, caramel notes" },
    { name: "Light Lager", price: 6, description: "Refreshing domestic lager" },
  ];

  for (let i = 0; i < beers.length; i++) {
    await prisma.menuItem.create({
      data: {
        categoryId: beerCat.id,
        name: beers[i].name,
        description: beers[i].description,
        price: beers[i].price,
        stationId: barStation.id,
        prepTime: 1,
        allergens: ["gluten"],
        tags: [],
        sortOrder: i,
      },
    });
  }

  // Wine
  const wineCat = await prisma.menuCategory.create({
    data: {
      menuId: dinnerMenu.id,
      name: "Wine",
      color: "#7C3AED",
      sortOrder: 4,
    },
  });

  const wines = [
    { name: "Cabernet Sauvignon", price: 14, description: "Napa Valley, bold and full-bodied" },
    { name: "Pinot Noir", price: 13, description: "Oregon, light with cherry notes" },
    { name: "Merlot", price: 12, description: "California, smooth and plummy" },
    { name: "Chardonnay", price: 12, description: "Sonoma, oaky with hints of vanilla" },
    { name: "Sauvignon Blanc", price: 11, description: "New Zealand, crisp and citrusy" },
    { name: "Prosecco", price: 10, description: "Italian sparkling, dry and refreshing" },
  ];

  for (let i = 0; i < wines.length; i++) {
    await prisma.menuItem.create({
      data: {
        categoryId: wineCat.id,
        name: wines[i].name,
        description: wines[i].description,
        price: wines[i].price,
        stationId: barStation.id,
        prepTime: 1,
        allergens: ["sulfites"],
        tags: [],
        sortOrder: i,
      },
    });
  }

  // Cocktails
  const cocktailsCat = await prisma.menuCategory.create({
    data: {
      menuId: dinnerMenu.id,
      name: "Cocktails",
      color: "#8B5CF6",
      sortOrder: 5,
    },
  });

  const cocktails = [
    { name: "Old Fashioned", price: 14, description: "Bourbon, bitters, orange, cherry" },
    { name: "Margarita", price: 13, description: "Tequila, triple sec, lime, salt rim" },
    { name: "Moscow Mule", price: 12, description: "Vodka, ginger beer, lime" },
    { name: "Mojito", price: 12, description: "Rum, mint, lime, soda" },
    { name: "Negroni", price: 14, description: "Gin, Campari, sweet vermouth" },
    { name: "Espresso Martini", price: 15, description: "Vodka, espresso, coffee liqueur" },
  ];

  for (let i = 0; i < cocktails.length; i++) {
    await prisma.menuItem.create({
      data: {
        categoryId: cocktailsCat.id,
        name: cocktails[i].name,
        description: cocktails[i].description,
        price: cocktails[i].price,
        stationId: barStation.id,
        prepTime: 3,
        allergens: [],
        tags: [],
        sortOrder: i,
      },
    });
  }

  // Create Suppliers
  console.log("  Creating suppliers...");
  const sysco = await prisma.supplier.create({
    data: {
      name: "Sysco Foods",
      contactName: "John Smith",
      email: "orders@sysco.example.com",
      phone: "(800) 555-0101",
    },
  });

  const localFarms = await prisma.supplier.create({
    data: {
      name: "Local Farms Direct",
      contactName: "Sarah Green",
      email: "orders@localfarms.example.com",
      phone: "(555) 555-0102",
    },
  });

  // Create Inventory Items
  console.log("  Creating inventory items...");
  const inventoryItems = [
    { name: "Ribeye (14oz)", category: "Protein", unit: "each", parLevel: 20, unitCost: 18, supplierId: sysco.id },
    { name: "Filet Mignon (8oz)", category: "Protein", unit: "each", parLevel: 15, unitCost: 16, supplierId: sysco.id },
    { name: "Atlantic Salmon", category: "Seafood", unit: "lb", parLevel: 30, unitCost: 14, supplierId: sysco.id },
    { name: "Ground Beef (Angus)", category: "Protein", unit: "lb", parLevel: 50, unitCost: 6, supplierId: sysco.id },
    { name: "Chicken (Whole)", category: "Protein", unit: "each", parLevel: 25, unitCost: 8, supplierId: sysco.id },
    { name: "Lobster Tail", category: "Seafood", unit: "each", parLevel: 10, unitCost: 22, supplierId: sysco.id },
    { name: "Calamari", category: "Seafood", unit: "lb", parLevel: 15, unitCost: 12, supplierId: sysco.id },
    { name: "Romaine Lettuce", category: "Produce", unit: "head", parLevel: 30, unitCost: 2.5, supplierId: localFarms.id },
    { name: "Heirloom Tomatoes", category: "Produce", unit: "lb", parLevel: 20, unitCost: 4, supplierId: localFarms.id },
    { name: "Burrata", category: "Dairy", unit: "each", parLevel: 15, unitCost: 6, supplierId: localFarms.id },
    { name: "Parmesan", category: "Dairy", unit: "lb", parLevel: 10, unitCost: 16, supplierId: sysco.id },
    { name: "Heavy Cream", category: "Dairy", unit: "qt", parLevel: 20, unitCost: 4, supplierId: sysco.id },
    { name: "Arborio Rice", category: "Dry Goods", unit: "lb", parLevel: 25, unitCost: 3, supplierId: sysco.id },
    { name: "Penne Pasta", category: "Dry Goods", unit: "lb", parLevel: 30, unitCost: 2, supplierId: sysco.id },
    { name: "Brioche Buns", category: "Bakery", unit: "each", parLevel: 40, unitCost: 1.5, supplierId: sysco.id },
    { name: "Fries (Frozen)", category: "Dry Goods", unit: "lb", parLevel: 50, unitCost: 2, supplierId: sysco.id },
    { name: "House IPA (Keg)", category: "Beverage", unit: "keg", parLevel: 3, unitCost: 150, supplierId: sysco.id },
    { name: "Cabernet Sauvignon", category: "Beverage", unit: "bottle", parLevel: 24, unitCost: 18, supplierId: sysco.id },
    { name: "Bourbon (Premium)", category: "Beverage", unit: "bottle", parLevel: 6, unitCost: 45, supplierId: sysco.id },
    { name: "Chocolate (Callebaut)", category: "Bakery", unit: "lb", parLevel: 10, unitCost: 12, supplierId: sysco.id },
  ];

  for (const item of inventoryItems) {
    await prisma.inventoryItem.create({
      data: {
        locationId: location.id,
        name: item.name,
        category: item.category,
        unit: item.unit,
        currentStock: Math.floor(item.parLevel * 1.2),
        parLevel: item.parLevel,
        reorderPoint: Math.floor(item.parLevel * 0.5),
        reorderQuantity: item.parLevel,
        unitCost: item.unitCost,
        supplierId: item.supplierId,
        storageLocation: ["Produce", "Dairy", "Protein", "Seafood"].includes(item.category)
          ? "Walk-in Cooler"
          : item.category === "Beverage"
            ? "Bar"
            : "Dry Storage",
      },
    });
  }

  // Create Tip Insights
  console.log("  Creating tip insights...");
  const tipInsights = [
    {
      category: "upselling",
      title: "The Power of Specificity",
      content: "Instead of asking 'Would you like a drink?', suggest a specific item: 'Our house margarita is excellent with this dish.' Specific suggestions increase acceptance rates by 25%.",
      source: "Cornell Hospitality Research",
    },
    {
      category: "personal_connection",
      title: "Introduce Yourself",
      content: "Studies show servers who introduce themselves by name receive 23% higher tips on average. Make eye contact, smile, and share your name when greeting the table.",
      source: "Journal of Applied Social Psychology",
    },
    {
      category: "timing",
      title: "The Strategic Refill",
      content: "Refill water glasses when 2/3 empty, not completely empty. This shows attentiveness without making guests feel rushed. Pre-emptive service correlates with higher tips.",
      source: "Restaurant Industry Research",
    },
    {
      category: "check_presentation",
      title: "Draw Something Personal",
      content: "Adding a simple drawing (smiley face or thank you) on the check increases tips by an average of 18%. Keep it professional but warm.",
      source: "Cornell Hotel School Study",
    },
    {
      category: "upselling",
      title: "The Dessert Tray",
      content: "Physically showing a dessert tray increases dessert orders by 30% compared to verbal descriptions alone. Visual presentation triggers appetite cues.",
      source: "Hospitality Management Research",
    },
  ];

  for (const insight of tipInsights) {
    await prisma.tipInsight.create({
      data: insight,
    });
  }

  // Create an Announcement
  await prisma.announcement.create({
    data: {
      locationId: location.id,
      title: "New Menu Items This Week",
      content: "We're introducing a Lobster Risotto special! Make sure to upsell this high-margin dish. Also, we're low on salmon - push the ribeye instead.",
      priority: "HIGH",
      createdById: managerUser.id,
    },
  });

  console.log("✅ Seed completed successfully!");
  console.log("\n📋 Test accounts:");
  console.log("   Admin:     admin@modernkitchen.com / password123");
  console.log("   Manager:   manager@modernkitchen.com / password123");
  console.log("   Server:    sam@modernkitchen.com / password123");
  console.log("   Bartender: bailey@modernkitchen.com / password123");
  console.log("   Cook:      chris@modernkitchen.com / password123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
