# CLAUDE.md - Mise POS Project Context

## Project Overview

**Mise POS** is a premium, AI-native point-of-sale system for the hospitality industry. The name comes from "mise en place" — the culinary principle of having everything in its place before service.

This is not a generic POS with bolted-on features. It's built by someone with CIA Hyde Park culinary training who understands how kitchens and front-of-house actually operate during a Friday night rush.

## Core Philosophy

1. **Offline-First**: System must work when internet drops. Restaurants can't stop taking orders.
2. **Real-Time Everything**: 86s, fires, ticket updates — no refresh buttons, instant propagation.
3. **AI-Native**: Intelligence isn't a feature, it's the foundation. Natural language queries, smart suggestions, predictive prep.
4. **Paperless Operations**: Requisitions, schedules, recipes, waste logs — all digital.
5. **Extensible**: Architecture ready for IoT, wearables, facial recognition, motion detection.

## Target User

- Independent restaurants and small chains
- Full-service dining (not fast food)
- Operations that care about food cost, labor optimization, and service quality
- Tech-forward operators who want intelligence, not just transactions

---

## Technical Stack

### Frontend
- **Next.js 14+** with App Router
- **TypeScript** (strict mode)
- **TailwindCSS** with custom design tokens
- **Radix UI** primitives for accessible components
- **Zustand** for client state
- **TanStack Query** for server state
- **Socket.io** or **Ably** for real-time

### Backend
- **Next.js API Routes** with **tRPC** for type-safe APIs
- **Prisma** ORM with **PostgreSQL**
- **Redis** for pub/sub and caching (Upstash for serverless)
- **NextAuth.js** for authentication

### AI/Intelligence
- **Anthropic Claude API** for natural language queries, special suggestions, tip insights
- Python microservice (FastAPI) for ML forecasting if needed later

### Deployment
- **Vercel** for web app
- **Neon** or **Supabase** for managed Postgres
- **Upstash** for Redis
- Docker option for edge/local deployment

---

## Monorepo Structure

```
mise-pos/
├── apps/
│   └── web/                    # Main Next.js application
│       ├── app/
│       │   ├── (auth)/         # Login, register
│       │   ├── (dashboard)/    # Manager dashboard, reports
│       │   ├── (pos)/          # POS terminal interface
│       │   ├── (kds)/          # Kitchen display system
│       │   ├── (staff)/        # Staff hub (tips, training, briefing)
│       │   └── api/
│       │       └── trpc/       # tRPC routers
│       ├── components/
│       │   ├── ui/             # Base shadcn/ui components
│       │   ├── pos/            # POS-specific components
│       │   ├── kds/            # Kitchen display components
│       │   ├── inventory/      # Inventory management
│       │   └── scheduling/     # Labor/scheduling
│       └── lib/
│           ├── stores/         # Zustand stores
│           ├── hooks/          # Custom hooks
│           └── utils/          # Utilities
│
├── packages/
│   ├── database/               # Prisma schema, client export
│   ├── types/                  # Shared TypeScript types + Zod schemas
│   ├── config/                 # Constants, permissions, settings
│   └── ai/                     # Claude API integration
│
└── docs/                       # Documentation
```

---

## Feature Domains (Priority Order)

### Phase 1: Core POS
- [ ] Menu management (items, categories, modifiers, modifier groups)
- [ ] Order creation and item entry
- [ ] Modifier selection flow
- [ ] Order sidebar with running total
- [ ] Fire/hold/drop order controls
- [ ] Basic check operations (close, split by seat)
- [ ] 86 system with real-time propagation

### Phase 2: Kitchen Display System
- [ ] Ticket view grouped by order
- [ ] Station filtering (grill, sauté, garde manger, bar, etc.)
- [ ] Ticket timing with color progression (blue → yellow → red)
- [ ] Bump functionality (single item, full ticket)
- [ ] Recall functionality
- [ ] Audio alerts for new tickets
- [ ] Course-based ticket grouping

### Phase 3: Inventory & Recipes
- [ ] Inventory item CRUD with par levels
- [ ] Stock counting interface
- [ ] Freshness tracking (received date, expiration, FIFO alerts)
- [ ] Recipe builder with ingredient linkage
- [ ] Automatic recipe costing from ingredient costs
- [ ] Contribution margin calculation
- [ ] Waste logging
- [ ] Automated requisition generation based on par levels

### Phase 4: Intelligence Layer
- [ ] Natural language query interface ("What sold best last Saturday?")
- [ ] AI-suggested daily specials based on:
  - Inventory levels and freshness
  - Historical sales patterns
  - Weather API integration
  - Day of week patterns
- [ ] Predictive prep lists from sales forecast
- [ ] Menu engineering reports (stars, plowhorses, puzzles, dogs)

### Phase 5: Labor & Scheduling
- [ ] Shift scheduling with role assignment
- [ ] Clock in/out (PIN-based, optional biometric later)
- [ ] Break tracking
- [ ] Labor cost as % of sales (real-time)
- [ ] Schedule publishing and shift swap requests

### Phase 6: Staff Intelligence Hub
- [ ] Daily briefing screen (86s, specials, VIPs, announcements)
- [ ] Tip optimization insights (research-backed upselling strategies)
- [ ] Item-specific selling points and pairing suggestions
- [ ] Performance metrics (optional gamification)

### Future: Device Ecosystem
- [ ] Smartwatch notifications (table wait times, 86 alerts)
- [ ] Bluetooth temperature probes for HACCP
- [ ] Zigbee sensors (walk-in temps, keg levels)
- [ ] Facial recognition clock-in
- [ ] Motion detection for table turn tracking
- [ ] Guest-facing QR ordering

---

## Database Schema (Key Entities)

### Organization & Auth
- `Organization` - Multi-tenant root
- `Location` - Physical restaurant
- `User` - Staff with role assignment
- `Role` - Permission groups with granular flags

### Menu System
- `Menu` - Menu versions (lunch, dinner, happy hour)
- `MenuCategory` - Groupings
- `MenuItem` - Items with price, station, prep time, allergens, tags
- `ModifierGroup` - "Choose your temp", required vs optional
- `Modifier` - Individual modifiers with price adjustments
- `MenuItemModifierGroup` - Junction for item-to-group linkage

### Orders
- `Order` - Parent order (table/tab) with status, totals
- `OrderItem` - Individual items with seat, course, status
- `OrderItemModifier` - Selected modifiers
- `Check` - Split check tracking
- `Payment` - Payment records
- `Void`, `Comp`, `Discount` - Adjustment records with approval tracking

### Inventory
- `InventoryItem` - Raw ingredients with par, cost, shelf life, storage location
- `InventoryCount` - Count history with variance
- `FreshnessLog` - Batch tracking for FIFO
- `Recipe` - Linked to MenuItem with yield
- `RecipeIngredient` - Ingredients with quantities
- `Supplier` - Vendor info
- `PurchaseOrder` - Requisitions
- `WasteLog` - Waste tracking by reason

### Operations
- `Station` - Kitchen stations
- `EightySix` - 86 records with timestamps
- `PrepTask` - Generated prep tasks
- `Shift` - Scheduled shifts
- `TimeEntry` - Clock records

### Intelligence
- `SalesSnapshot` - Aggregated sales by hour/day
- `ForecastRecord` - Demand predictions
- `SpecialSuggestion` - AI-generated specials
- `TipInsight` - Tip optimization content
- `QueryLog` - Natural language query history

---

## Key Enums

```typescript
OrderStatus: OPEN | SENT | IN_PROGRESS | READY | SERVED | CLOSED | VOID
OrderType: DINE_IN | TAKEOUT | DELIVERY | BAR_TAB
OrderItemStatus: PENDING | HELD | FIRED | IN_PROGRESS | READY | SERVED | VOID
PaymentMethod: CASH | CREDIT | DEBIT | GIFT_CARD | HOUSE_ACCOUNT | COMP
ShiftStatus: SCHEDULED | CONFIRMED | IN_PROGRESS | COMPLETED | NO_SHOW | CANCELLED
FreshnessStatus: FRESH | USE_FIRST | EXPIRING_SOON | EXPIRED
```

---

## Real-Time Events

Channel pattern: `location:{locationId}:{domain}`

```
ORDER_CREATED, ORDER_UPDATED, ORDER_FIRED, ORDER_COMPLETED
ITEM_EIGHTY_SIXED, ITEM_AVAILABLE
TICKET_BUMPED, TICKET_RECALLED
INVENTORY_LOW, INVENTORY_OUT
SHIFT_STARTED, ANNOUNCEMENT
```

---

## UI/UX Principles

### POS Terminal
- Maximum 2 taps to add any item
- Modifier selection via large touch targets or swipe
- Color-coded item status (normal, 86'd, low stock)
- Persistent order sidebar
- Minimum touch target: 44px, preferred: 56px
- No hover states — touch-first design

### Kitchen Display
- High contrast dark theme for kitchen environment
- Large text (1.25rem minimum)
- Audio cues for new tickets and rush orders
- Color progression: new (blue) → cooking (yellow) → ready (green) → late (red)
- Greasy-finger-friendly touch targets

### Manager Dashboard
- Glanceable KPIs above the fold
- Natural language search bar prominent
- Drill-down on every metric
- Mobile-responsive for floor walks

---

## AI Integration Points

### Natural Language Queries
System prompt focuses on restaurant data domains (sales, inventory, labor, menu). Returns concise answers with specific numbers. Can suggest visualization type.

### Special Suggestions
Takes inventory levels, freshness status, day of week, weather. Returns dish name, description, suggested price, key ingredients, reasoning, estimated food cost.

### Tip Insights
Research-backed tips categorized by: upselling, personal connection, timing, check presentation, body language.

### Prep List Generation
Uses forecasted covers × historical item mix to calculate needed quantities, compares to current inventory, generates prioritized prep tasks.

---

## Authentication & Permissions

Role-based with granular permissions:
- `orders.create`, `orders.void`, `orders.comp`, `orders.discount`
- `menu.view`, `menu.edit`, `menu.eightysix`
- `kitchen.view`, `kitchen.bump`, `kitchen.recall`
- `inventory.view`, `inventory.count`, `inventory.order`, `inventory.waste`
- `labor.view_own`, `labor.view_all`, `labor.schedule`
- `reports.view`, `reports.export`
- `admin.users`, `admin.settings`

Quick login via 4-digit PIN on terminals.

---

## Code Style Guidelines

- TypeScript strict mode, no `any` types
- Zod schemas for all API inputs
- Prefer server components, use `'use client'` only when needed
- Co-locate components with their routes when possible
- Use Prisma transactions for multi-step operations
- Error boundaries at route level
- Optimistic updates for real-time feel

---

## Environment Variables

```
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
ANTHROPIC_API_KEY=
REDIS_URL=
```

---

## Commands

```bash
pnpm dev          # Start development
pnpm build        # Production build
pnpm db:push      # Push schema to database
pnpm db:generate  # Generate Prisma client
pnpm db:studio    # Open Prisma Studio
pnpm db:seed      # Seed demo data
```

---

## Notes for Development

1. **Start with the order flow** — this is the core. Menu → Add Item → Modifiers → Fire → Kitchen.

2. **86 system is critical** — must propagate instantly to all terminals and KDS. WebSocket essential.

3. **Offline capability** is a Phase 2 concern but architect for it now (service worker, IndexedDB sync).

4. **Recipe costing** should auto-calculate when ingredients or quantities change.

5. **The "smart" features are the differentiator** — prioritize the AI query interface and special suggestions once core POS works.

6. **Kitchen display dark theme** is separate from main app theming — kitchen environment needs high contrast.

7. **Touch targets matter** — this runs on tablets with greasy fingers, not desktop with mouse precision.

---

## Demo Data Seed

When seeding, create:
- 1 organization, 1 location
- Roles: Admin, Manager, Server, Bartender, Line Cook
- 3-4 users
- Sample menu with:
  - Appetizers (5 items)
  - Entrees (8 items) 
  - Desserts (3 items)
  - Beer (6 items)
  - Wine (6 items)
  - Cocktails (6 items)
- Modifier groups: Temperature, Sides, Add-ons, Dressings
- 20-30 inventory items across categories
- 5-10 recipes linked to menu items
- Sample historical sales data for AI features

---

## Questions to Resolve

- Payment processor integration (Stripe Terminal, Square, or processor-agnostic?)
- Reservation system integration (OpenTable API, Resy, or built-in?)
- Delivery platform integration (DoorDash, UberEats aggregation?)
- Accounting sync (QuickBooks, Xero?)

---

*"The ticket printer doesn't care about your excuses."*
