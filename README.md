# Mise POS - Intelligent Hospitality Platform

> *"Mise en place"* — everything in its place. A premium point-of-sale system built by someone who's actually worked the line.

## Vision

Mise is not another tablet POS with bolted-on features. It's a complete hospitality intelligence platform that treats the kitchen, bar, and floor as an integrated system. Every feature exists because it solves a real problem that operators face during a Friday night rush.

## Core Philosophy

1. **Offline-First**: The system works when your internet doesn't
2. **Real-Time Everything**: 86s, fires, tickets — no refresh buttons
3. **Intelligence-Native**: Smart features aren't bolted on, they're foundational
4. **Paperless Operations**: From requisitions to schedules to recipes
5. **Extensible**: Ready for IoT, wearables, and devices we haven't imagined yet

---

## Tech Stack

### Languages
- **TypeScript** (70 files) - Type-safe application logic, API routes, components
- **TSX** (57 files) - React components for POS, KDS, and dashboard interfaces
- **JavaScript** (2 files) - Service worker and configuration files
- **CSS** (1 file) - Global styles and Tailwind directives

### Frontend
- **Next.js 14+** (App Router) - React framework with server components
- **TypeScript** - Full type safety across the stack
- **TailwindCSS** - Utility-first styling
- **Zustand** - Lightweight state management
- **React Query (TanStack Query)** - Server state and caching

### Backend
- **Next.js API Routes** - RESTful endpoints
- **tRPC** - End-to-end type-safe APIs
- **Prisma** - Type-safe database ORM
- **PostgreSQL** - Primary database
- **Redis** (optional) - Real-time pub/sub and caching

### Real-Time
- **Server-Sent Events (SSE)** - Push updates for 86s, orders, tickets
- **Event Emitter** - Internal event bus for propagation

### Authentication
- **NextAuth.js** - Session management and OAuth
- **Role-based permissions** - Granular access control
- **PIN authentication** - Quick terminal login

### AI & Intelligence
- **Anthropic API** - Natural language query interface
- **Menu engineering analysis** - Data-driven insights
- **Inventory forecasting** - Smart prep lists and specials

### Progressive Web App
- **Service Worker** - Offline-first caching strategy
- **PWA Manifest** - Home screen installation
- **Background Sync** - Queued actions when offline

### Deployment
- **Vercel** - Web application hosting
- **Railway/Render** - Database and Redis services
- **Docker** - Local development with PostgreSQL

---

## Project Structure

```
mise-pos/
├── apps/
│   └── web/                    # Main Next.js application
│       ├── app/
│       │   ├── (auth)/         # Auth routes (login, PIN entry)
│       │   ├── (dashboard)/    # Manager dashboard with AI query
│       │   ├── (pos)/          # POS terminal interface
│       │   ├── (kds)/          # Kitchen display system
│       │   ├── (staff)/        # Staff hub (tips, briefing)
│       │   └── api/            # API routes + tRPC + SSE
│       ├── components/
│       │   ├── ui/             # Base shadcn/ui components
│       │   ├── pos/            # POS-specific components
│       │   ├── kds/            # Kitchen display components
│       │   └── pwa-register.tsx # PWA registration
│       ├── lib/
│       │   ├── api/routers/    # tRPC routers
│       │   ├── realtime/       # SSE event emitter
│       │   ├── stores/         # Zustand stores
│       │   └── hooks/          # Custom hooks (PWA, socket, etc.)
│       └── public/
│           ├── manifest.json   # PWA manifest
│           └── sw.js           # Service worker
│
├── packages/
│   ├── database/               # Prisma schema and client (40+ models)
│   ├── types/                  # Shared TypeScript types + Zod
│   ├── config/                 # Shared configuration
│   └── ai/                     # AI API integration
│
└── scripts/                    # Seed and utility scripts
```

---

## Features

### Phase 1: Foundation - COMPLETE
- [x] Project setup with Next.js 14+, TypeScript, TailwindCSS
- [x] Database schema with 40+ Prisma models
- [x] Authentication with NextAuth.js and role-based permissions
- [x] PIN-based quick login for terminals
- [x] Menu CRUD with categories, items, modifiers
- [x] Order creation flow with course-based ordering
- [x] Kitchen Display System (KDS) with station views

### Phase 2: Core Operations - COMPLETE
- [x] Real-time updates via Server-Sent Events (SSE)
- [x] 86 system with instant propagation to all terminals
- [x] Fire/hold/drop order controls
- [x] Check splitting by seat, item, or amount
- [x] Kitchen station routing (grill, sauté, fry, expo, bar)
- [x] Manager dashboard with real-time KPIs

### Phase 3: Intelligence Layer - COMPLETE
- [x] Inventory tracking with recipe integration
- [x] Recipe costing sheets with real-time calculations
- [x] Natural language query interface
- [x] AI-suggested daily specials based on inventory/freshness
- [x] Freshness cycling alerts (FIFO tracking)
- [x] Menu engineering analysis (stars, plowhorses, puzzles, dogs)
- [x] AI-generated prep lists based on forecasted covers

### Phase 4: Labor & Staff - COMPLETE
- [x] Staff intelligence hub with daily briefing
- [x] Tip optimization insights (research-backed)
- [x] Performance metrics display
- [x] Shift scheduling infrastructure
- [x] Clock in/out with shift tracking

### Phase 5: Polish & Scale - COMPLETE
- [x] PWA with offline capability (service worker)
- [x] Mobile-responsive design with touch optimization
- [x] Install prompt for adding to home screen
- [x] Offline indicator and queued actions sync

### Phase 6: Device Ecosystem - PLANNED
- [ ] Smartwatch integration
- [ ] IoT sensor framework
- [ ] Facial recognition clock-in
- [ ] Guest-facing mobile ordering (QR)

---

## Getting Started

### Prerequisites

| Requirement | How to Get |
|-------------|------------|
| Node.js 18+ | [nodejs.org](https://nodejs.org) |
| pnpm | `npm install -g pnpm` |
| PostgreSQL | Docker (below) or [Neon](https://neon.tech) (free) |

### Quick Start with Docker

```bash
# 1. Start PostgreSQL
docker run -d --name mise-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=mise_pos \
  -p 5432:5432 postgres:16

# 2. Setup project
pnpm install
cp .env.example .env.local

# 3. Generate a secret key and add to .env.local
openssl rand -base64 32

# 4. Initialize database
pnpm db:generate
pnpm db:push
pnpm db:seed

# 5. Run
pnpm dev
```

### Environment Variables

```bash
# Required
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mise_pos
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000

# Required for AI features
ANTHROPIC_API_KEY=sk-ant-...

# Optional
REDIS_URL=redis://...  # Only for multi-server scaling
```

### Default Login

After seeding:
- **Email**: `dev@ohanarecovery.org`
- **Password**: `Keala808!`
- **PIN** (terminal): `1234`

---

## Database Schema

40+ Prisma models organized into domains:

- **Core**: Organization, Location, User, Role, Settings
- **Menu**: Menu, MenuCategory, MenuItem, ModifierGroup, Modifier
- **Orders**: Order, OrderItem, Check, Payment, Void, Comp, Discount
- **Inventory**: InventoryItem, Recipe, RecipeIngredient, FreshnessLog, Supplier, WasteLog
- **Operations**: Shift, Station, EightySix, PrepTask, TemperatureLog
- **Intelligence**: SalesSnapshot, ForecastRecord, SpecialSuggestion, QueryLog

See `packages/database/prisma/schema.prisma` for full schema.

---

## tRPC Routers

Type-safe API with the following routers:

| Router | Key Endpoints |
|--------|--------------|
| `auth` | login, pinLogin, session |
| `menu` | getMenus, getMenuItems, eightySix (real-time), unEightySix |
| `orders` | createOrder, addItem, fireOrder, splitCheck, applyPayment, voidItem |
| `kitchen` | getTickets, bumpTicket (real-time), recallTicket, getStations |
| `inventory` | getItems, updateCount, getFreshnessAlerts, logWaste |
| `recipes` | getRecipes, getRecipeCost, analyzeMargins |
| `labor` | getSchedule, createShift, clockIn, clockOut |
| `intelligence` | query (NL), getSuggestions, getPrepList, getTipInsights, getMenuEngineering |
| `reports` | salesSummary, laborCost, foodCost, itemPerformance |

---

## Real-Time (SSE)

Server-Sent Events at `/api/sse/[locationId]` for instant propagation:

- `ITEM_EIGHTY_SIXED` / `ITEM_AVAILABLE` - Critical 86 updates
- `ORDER_CREATED` / `ORDER_FIRED` / `ORDER_COMPLETED`
- `TICKET_BUMPED` / `TICKET_RECALLED`
- `INVENTORY_LOW` / `ANNOUNCEMENT`

---

## UI/UX Principles

- **POS Terminal**: 2-tap item entry, 56px touch targets, color-coded 86 status
- **Kitchen Display**: Dark theme, large text, color progression (blue → yellow → green)
- **Manager Dashboard**: Glanceable KPIs, AI query bar, mobile-responsive
- **Staff Hub**: Daily briefing, tip insights, menu reference

---

## PWA & Offline

- Service worker with cache-first strategy for assets
- Offline indicator with queued actions sync
- Install prompt for home screen addition
- Hourly background update checks

---

## Permissions

Role-based with granular permissions: `orders.*`, `menu.*`, `kitchen.*`, `inventory.*`, `labor.*`, `reports.*`, `intelligence.*`, `admin.*`

See `packages/types/src/permissions.ts` for full list.

---

## License

Proprietary - All Rights Reserved

---

*"The ticket printer doesn't care about your excuses."*
