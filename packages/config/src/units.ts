// Unit definitions for inventory and recipes
export const UNITS = {
  // Weight
  lb: { label: "Pound", plural: "Pounds", abbr: "lb", type: "weight" },
  oz: { label: "Ounce", plural: "Ounces", abbr: "oz", type: "weight" },
  kg: { label: "Kilogram", plural: "Kilograms", abbr: "kg", type: "weight" },
  g: { label: "Gram", plural: "Grams", abbr: "g", type: "weight" },

  // Volume
  gal: { label: "Gallon", plural: "Gallons", abbr: "gal", type: "volume" },
  qt: { label: "Quart", plural: "Quarts", abbr: "qt", type: "volume" },
  pt: { label: "Pint", plural: "Pints", abbr: "pt", type: "volume" },
  cup: { label: "Cup", plural: "Cups", abbr: "cup", type: "volume" },
  floz: { label: "Fluid Ounce", plural: "Fluid Ounces", abbr: "fl oz", type: "volume" },
  tbsp: { label: "Tablespoon", plural: "Tablespoons", abbr: "tbsp", type: "volume" },
  tsp: { label: "Teaspoon", plural: "Teaspoons", abbr: "tsp", type: "volume" },
  ml: { label: "Milliliter", plural: "Milliliters", abbr: "ml", type: "volume" },
  l: { label: "Liter", plural: "Liters", abbr: "L", type: "volume" },

  // Count
  each: { label: "Each", plural: "Each", abbr: "ea", type: "count" },
  dozen: { label: "Dozen", plural: "Dozen", abbr: "dz", type: "count" },
  case: { label: "Case", plural: "Cases", abbr: "cs", type: "count" },
  bunch: { label: "Bunch", plural: "Bunches", abbr: "bch", type: "count" },
  head: { label: "Head", plural: "Heads", abbr: "hd", type: "count" },
  slice: { label: "Slice", plural: "Slices", abbr: "sl", type: "count" },
  portion: { label: "Portion", plural: "Portions", abbr: "por", type: "count" },
} as const;

export type UnitKey = keyof typeof UNITS;
export type UnitType = "weight" | "volume" | "count";

// Conversion factors (to base units: grams for weight, ml for volume)
export const UNIT_CONVERSIONS: Record<string, number> = {
  // Weight (to grams)
  lb: 453.592,
  oz: 28.3495,
  kg: 1000,
  g: 1,

  // Volume (to ml)
  gal: 3785.41,
  qt: 946.353,
  pt: 473.176,
  cup: 236.588,
  floz: 29.5735,
  tbsp: 14.7868,
  tsp: 4.92892,
  ml: 1,
  l: 1000,
};

// Get units by type
export function getUnitsByType(type: UnitType): UnitKey[] {
  return (Object.entries(UNITS) as [UnitKey, (typeof UNITS)[UnitKey]][])
    .filter(([, value]) => value.type === type)
    .map(([key]) => key);
}

// Convert between units of the same type
export function convertUnits(
  value: number,
  fromUnit: UnitKey,
  toUnit: UnitKey
): number | null {
  const from = UNITS[fromUnit];
  const to = UNITS[toUnit];

  if (from.type !== to.type) {
    return null; // Cannot convert between different types
  }

  if (from.type === "count") {
    return null; // Count units typically can't be converted
  }

  const fromFactor = UNIT_CONVERSIONS[fromUnit];
  const toFactor = UNIT_CONVERSIONS[toUnit];

  if (!fromFactor || !toFactor) {
    return null;
  }

  // Convert to base unit, then to target unit
  const baseValue = value * fromFactor;
  return baseValue / toFactor;
}
