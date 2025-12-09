// FDA Big 9 allergens (plus common additions)
export const ALLERGENS = {
  milk: { label: "Milk", icon: "🥛", color: "#F3F4F6" },
  eggs: { label: "Eggs", icon: "🥚", color: "#FEF3C7" },
  fish: { label: "Fish", icon: "🐟", color: "#DBEAFE" },
  shellfish: { label: "Shellfish", icon: "🦐", color: "#FEE2E2" },
  tree_nuts: { label: "Tree Nuts", icon: "🌰", color: "#FED7AA" },
  peanuts: { label: "Peanuts", icon: "🥜", color: "#FEF08A" },
  wheat: { label: "Wheat", icon: "🌾", color: "#FDE68A" },
  soy: { label: "Soy", icon: "🫘", color: "#D9F99D" },
  sesame: { label: "Sesame", icon: "⚪", color: "#E5E7EB" },
  gluten: { label: "Gluten", icon: "🍞", color: "#FBBF24" },
  sulfites: { label: "Sulfites", icon: "🍷", color: "#C4B5FD" },
} as const;

export type AllergenKey = keyof typeof ALLERGENS;

export const ALLERGEN_KEYS = Object.keys(ALLERGENS) as AllergenKey[];

// Allergen warning levels
export const ALLERGEN_WARNING_LEVELS = {
  contains: "Contains",
  may_contain: "May contain traces of",
  prepared_with: "Prepared in facility with",
} as const;
