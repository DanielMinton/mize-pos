# Mise POS - Intelligent Hospitality Platform

> *"Mise en place"* — everything in its place. A premium, AI-native point-of-sale system built by someone who's actually worked the line.

## Vision

Mise is not another tablet POS with bolted-on features. It's a complete hospitality intelligence platform that treats the kitchen, bar, and floor as an integrated system. Every feature exists because it solves a real problem that operators face during a Friday night rush.

## Core Philosophy

1. **Offline-First**: The system works when your internet doesn't
2. **Real-Time Everything**: 86s, fires, tickets — no refresh buttons
3. **AI-Native**: Intelligence isn't a feature, it's the foundation
4. **Paperless Operations**: From requisitions to schedules to recipes
5. **Extensible**: Ready for IoT, wearables, and devices we haven't imagined yet

---

## Feature Domains

### 1. Order Management (Core POS)
- Menu building with unlimited modifiers, forced modifiers, modifier pricing
- Course-based ordering with fire/hold/drop controls
- Split checks by seat, item, or arbitrary amount
- Tab management for bar operations
- Table merge/transfer
- Comps, voids, discounts with manager approval workflows
- Guest profiles (preferences, allergies, visit history)

### 2. Kitchen Operations
- Kitchen Display System (KDS) with station routing
- Real-time 86 management propagating to all terminals instantly
- Ticket sequencing based on cook times and station load
- Course firing with expo view
- Prep task generation from forecast
- Station-specific views (grill, sauté, garde manger, pastry)

### 3. Inventory Intelligence
- Par level management with automated requisition generation
- Real-time inventory decrement on order
- Shelf life tracking with FIFO/freshness cycling alerts
- Waste logging integrated with prep
- Supplier integration for automated ordering
- Cross-utilization tracking (which items share ingredients)

### 4. Recipe & Menu Engineering
- Recipe costing sheets with real-time ingredient costs
- Contribution margin analysis by item
- Menu item performance (sales velocity, profit per seat-hour)
- AI-suggested specials based on:
  - Inventory levels (use it or lose it)
  - Ingredient freshness windows
  - Historical performance of similar items
  - Current weather and local events
- Theoretical vs actual food cost variance

### 5. Labor & Scheduling
- Role-based scheduling (server, bartender, line cook, etc.)
- Shift templates with labor cost forecasting
- Break tracking and compliance
- Tip pooling calculations
- Clock in/out with optional biometric
- Schedule publishing and shift swap requests
- Labor cost as percentage of sales (real-time)

### 6. Staff Intelligence Hub
- Proven upselling strategies with success metrics
- Item-specific selling points and pairing suggestions
- Daily briefing: 86s, features, VIP arrivals, specials
- Performance gamification (optional)
- Training content delivery
- Tip optimization insights backed by data

### 7. Reporting & Analytics
- Natural language query interface ("What sold best last Saturday dinner?")
- Real-time dashboards: sales, labor, covers, check average
- Historical trend analysis
- Comparative reporting (this week vs last, this year vs last)
- Custom report builder
- Scheduled report delivery

### 8. Device Ecosystem (Future)
- Smartwatch notifications for managers (table wait times, 86 alerts)
- Bluetooth temperature probes for HACCP logging
- Zigbee-connected sensors (walk-in temps, keg levels)
- Facial recognition for staff clock-in
- Motion detection for table turn tracking
- Mobile ordering for guests (QR-based)

---

## Technical Architecture

### Stack

```
Frontend:        Next.js 14+ (App Router) + TypeScript + TailwindCSS
State:           Zustand + React Query (TanStack Query)
Real-time:       Socket.io or Ably for WebSocket layer
Backend:         Next.js API Routes + tRPC for type-safe APIs
Database:        PostgreSQL (Neon or Supabase for managed)
ORM:             Prisma
Cache/Pubsub:    Redis (Upstash for serverless)
Auth:            NextAuth.js with role-based access
AI/LLM:          Anthropic Claude API for natural language features
ML Pipeline:     Python microservice for forecasting (FastAPI)
File Storage:    S3-compatible (Cloudflare R2 or AWS S3)
Deployment:      Vercel (web) + Railway/Render (services)
Edge Runtime:    Optional local deployment via Docker
```

### Project Structure

```
mise-pos/
├── apps/
│   ├── web/                    # Main Next.js application
│   │   ├── app/
│   │   │   ├── (auth)/         # Auth routes (login, register)
│   │   │   ├── (dashboard)/    # Manager dashboard
│   │   │   ├── (pos)/          # POS terminal interface
│   │   │   ├── (kds)/          # Kitchen display system
│   │   │   ├── (staff)/        # Staff hub (tips, training)
│   │   │   ├── api/            # API routes
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── ui/             # Base UI components
│   │   │   ├── pos/            # POS-specific components
│   │   │   ├── kds/            # Kitchen display components
│   │   │   ├── inventory/      # Inventory components
│   │   │   └── scheduling/     # Labor/scheduling components
│   │   ├── lib/
│   │   │   ├── api/            # API client utilities
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── stores/         # Zustand stores
│   │   │   ├── utils/          # Utility functions
│   │   │   └── validators/     # Zod schemas
│   │   └── styles/
│   │
│   └── ml-service/             # Python ML microservice
│       ├── forecasting/        # Demand forecasting
│       ├── recommendations/    # Menu recommendations
│       └── api/                # FastAPI endpoints
│
├── packages/
│   ├── database/               # Prisma schema and migrations
│   ├── types/                  # Shared TypeScript types
│   ├── config/                 # Shared configuration
│   └── ai/                     # AI/LLM integration utilities
│
├── docs/                       # Documentation
├── scripts/                    # Development and deployment scripts
└── docker/                     # Docker configurations
```

---

## Database Schema Overview

### Core Entities

```
Organization          # Multi-tenant root
├── Location          # Physical restaurant location
├── User              # Staff members
├── Role              # Permission groups
└── Settings          # Org-level configuration

Menu System
├── Menu              # Menu versions (lunch, dinner, happy hour)
├── MenuCategory      # Appetizers, Entrees, Desserts, etc.
├── MenuItem          # Individual menu items
├── ModifierGroup     # "Choose your temp", "Add-ons"
├── Modifier          # Medium-rare, Add bacon, etc.
└── MenuItemModifier  # Junction table

Inventory
├── InventoryItem     # Raw ingredients
├── InventoryCount    # Current stock levels
├── Recipe            # Recipe definitions
├── RecipeIngredient  # Recipe components with quantities
├── Supplier          # Vendor information
├── PurchaseOrder     # Requisitions
└── WasteLog          # Waste tracking

Orders
├── Order             # Parent order (table/tab)
├── OrderItem         # Individual items ordered
├── OrderItemModifier # Modifiers on order items
├── Payment           # Payment records
├── Check             # Split check tracking
└── Void/Comp         # Adjustment records

Operations
├── Shift             # Scheduled shifts
├── TimeEntry         # Clock in/out records
├── Station           # Kitchen stations
├── EightySix         # 86 records with timestamps
├── PrepTask          # Generated prep tasks
└── TemperatureLog    # HACCP compliance

Intelligence
├── SalesSnapshot     # Aggregated sales data
├── ForecastRecord    # Demand predictions
├── SpecialSuggestion # AI-generated specials
├── TipInsight        # Tip optimization data
└── QueryLog          # Natural language query history
```

---

## API Design (tRPC Routers)

```typescript
// Router structure
├── auth
│   ├── login
│   ├── logout
│   └── session
│
├── menu
│   ├── getMenus
│   ├── getMenuItems
│   ├── createMenuItem
│   ├── updateMenuItem
│   ├── deleteMenuItem
│   └── getModifiers
│
├── orders
│   ├── createOrder
│   ├── addItem
│   ├── removeItem
│   ├── fireOrder
│   ├── holdOrder
│   ├── splitCheck
│   ├── applyPayment
│   └── voidItem
│
├── kitchen
│   ├── getTickets
│   ├── bumpTicket
│   ├── recallTicket
│   ├── eightySix
│   ├── unEightySix
│   └── getStationView
│
├── inventory
│   ├── getItems
│   ├── updateCount
│   ├── getAlerts
│   ├── createRequisition
│   └── logWaste
│
├── recipes
│   ├── getRecipes
│   ├── getRecipeCost
│   ├── updateRecipe
│   └── analyzeMargins
│
├── labor
│   ├── getSchedule
│   ├── createShift
│   ├── clockIn
│   ├── clockOut
│   └── requestSwap
│
├── intelligence
│   ├── query              # Natural language queries
│   ├── getSuggestions     # AI specials suggestions
│   ├── getForecast        # Demand forecast
│   └── getTipInsights     # Tip optimization
│
└── reports
    ├── salesSummary
    ├── laborCost
    ├── foodCost
    └── itemPerformance
```

---

## Real-Time Events (WebSocket Channels)

```typescript
// Pub/Sub channels per location
location:{id}:orders        // New orders, updates
location:{id}:kitchen       // Ticket flow, bumps
location:{id}:eightysix     // 86 broadcasts (CRITICAL)
location:{id}:inventory     // Stock alerts
location:{id}:staff         // Shift changes, announcements

// Event payloads
ORDER_CREATED
ORDER_UPDATED
ORDER_FIRED
ORDER_COMPLETED
ITEM_EIGHTY_SIXED
ITEM_AVAILABLE
TICKET_BUMPED
INVENTORY_LOW
SHIFT_STARTED
ANNOUNCEMENT
```

---

## UI/UX Principles

### POS Terminal
- Maximum 2 taps to add any item
- Modifier selection via swipe gestures
- Color-coded item status (normal, 86'd, low stock)
- Persistent order sidebar
- One-hand operation where possible

### Kitchen Display
- High contrast for kitchen environment
- Large touch targets for greasy fingers
- Audio cues for new tickets, rush orders
- Color progression: new (blue) → cooking (yellow) → ready (green)
- Station filtering with single tap

### Manager Dashboard
- Glanceable KPIs above the fold
- Drill-down capability on every metric
- Natural language search bar prominent
- Mobile-responsive for floor walks

### Staff Hub
- Card-based tip insights
- Daily briefing as first screen
- Gamification elements subtle, not distracting
- Quick access to menu item details

---

## Development Phases

### Phase 1: Foundation (Weeks 1-2)
- [ ] Project setup with Next.js, TypeScript, Tailwind
- [ ] Database schema and Prisma setup
- [ ] Authentication with role-based access
- [ ] Basic menu CRUD
- [ ] Order creation flow
- [ ] Simple KDS view

### Phase 2: Core Operations (Weeks 3-4)
- [ ] Real-time order updates via WebSocket
- [ ] 86 system with instant propagation
- [ ] Fire/hold/drop order controls
- [ ] Check splitting
- [ ] Kitchen station routing
- [ ] Basic reporting dashboard

### Phase 3: Intelligence Layer (Weeks 5-6)
- [ ] Inventory tracking with recipe integration
- [ ] Recipe costing sheets
- [ ] Natural language query interface
- [ ] AI special suggestions
- [ ] Freshness cycling alerts
- [ ] Automated requisition generation

### Phase 4: Labor & Staff (Weeks 7-8)
- [ ] Shift scheduling
- [ ] Clock in/out
- [ ] Staff intelligence hub
- [ ] Tip insights
- [ ] Labor cost tracking

### Phase 5: Polish & Scale (Weeks 9-10)
- [ ] Performance optimization
- [ ] Offline capability (PWA)
- [ ] Mobile-specific views
- [ ] Edge deployment option
- [ ] Documentation

### Phase 6: Device Ecosystem (Future)
- [ ] Smartwatch integration
- [ ] IoT sensor framework
- [ ] Facial recognition clock-in
- [ ] Guest-facing mobile ordering

---

## Getting Started

```bash
# Clone and install
git clone <repo>
cd mise-pos
pnpm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your database URL, API keys

# Initialize database
pnpm db:push
pnpm db:seed

# Run development server
pnpm dev
```

---

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# AI
ANTHROPIC_API_KEY=

# Real-time
REDIS_URL=

# Storage
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=
```

---

## License

Proprietary - All Rights Reserved

---

## Author

Built with hard-won kitchen knowledge and modern engineering.

*"The ticket printer doesn't care about your excuses."*
