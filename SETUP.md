# Mise POS — Local Setup Guide

## Prerequisites

```
Node.js 18+     → nodejs.org
pnpm            → npm install -g pnpm
Docker Desktop  → docker.com (for PostgreSQL)
```

---

## Quick Start

```bash
# 1. Start PostgreSQL
docker run -d --name mise-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=mise_pos \
  -p 5432:5432 \
  postgres:16

# 2. Install dependencies
pnpm install

# 3. Configure environment
cp .env.example .env.local

# 4. Add your secrets to .env.local
#    Generate NEXTAUTH_SECRET:
openssl rand -base64 32

# 5. Initialize database
pnpm db:generate
pnpm db:push
pnpm db:seed

# 6. Start development server
pnpm dev
```

Open **http://localhost:3000**

---

## Environment Variables

Edit `.env.local`:

```bash
# ═══════════════════════════════════════════════════════════════
# REQUIRED
# ═══════════════════════════════════════════════════════════════

DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mise_pos"
NEXTAUTH_SECRET="<paste output from: openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"

# ═══════════════════════════════════════════════════════════════
# REQUIRED FOR AI FEATURES
# ═══════════════════════════════════════════════════════════════

ANTHROPIC_API_KEY="sk-ant-..."   # Get from console.anthropic.com

# ═══════════════════════════════════════════════════════════════
# OPTIONAL
# ═══════════════════════════════════════════════════════════════

REDIS_URL="redis://localhost:6379"   # Only for multi-server scaling
```

---

## Default Login

| Field    | Value                    |
|----------|--------------------------|
| Email    | `dev@ohanarecovery.org`  |
| Password | `Keala808!`              |
| PIN      | `1234`                   |

---

## Available Commands

```bash
pnpm dev            # Start dev server (http://localhost:3000)
pnpm build          # Production build
pnpm type-check     # TypeScript validation
pnpm db:generate    # Generate Prisma client
pnpm db:push        # Push schema to database
pnpm db:seed        # Seed demo data
pnpm db:studio      # Open Prisma Studio (database GUI)
```

---

## Project Structure

```
mise-pos/
│
├── apps/
│   └── web/                          # Next.js 14+ Application
│       ├── app/
│       │   ├── (auth)/               # Authentication
│       │   │   ├── login/            #   └─ Email/password login
│       │   │   └── pin/              #   └─ PIN-based terminal login
│       │   │
│       │   ├── (pos)/                # POS Terminal
│       │   │   └── terminal/         #   └─ Order entry interface
│       │   │
│       │   ├── (kds)/                # Kitchen Display System
│       │   │   └── kitchen/          #   └─ Ticket management
│       │   │
│       │   ├── (dashboard)/          # Manager Dashboard
│       │   │   └── dashboard/        #   └─ KPIs, AI queries, reports
│       │   │
│       │   ├── (staff)/              # Staff Hub
│       │   │   └── staff/            #   └─ Briefing, tips, performance
│       │   │
│       │   └── api/
│       │       ├── trpc/             # tRPC API endpoint
│       │       ├── sse/              # Real-time Server-Sent Events
│       │       └── auth/             # NextAuth.js handlers
│       │
│       ├── components/
│       │   ├── ui/                   # Base UI (shadcn/ui)
│       │   ├── pos/                  # POS-specific components
│       │   ├── kds/                  # Kitchen display components
│       │   └── pwa-register.tsx      # PWA service worker registration
│       │
│       ├── lib/
│       │   ├── api/
│       │   │   ├── trpc-client.ts    # tRPC client setup
│       │   │   ├── trpc-server.ts    # tRPC server setup
│       │   │   └── routers/          # API route handlers
│       │   │       ├── auth.ts       #   └─ Authentication
│       │   │       ├── menu.ts       #   └─ Menu & 86 management
│       │   │       ├── orders.ts     #   └─ Order operations
│       │   │       ├── kitchen.ts    #   └─ KDS & tickets
│       │   │       ├── inventory.ts  #   └─ Stock & recipes
│       │   │       ├── labor.ts      #   └─ Shifts & scheduling
│       │   │       ├── intelligence.ts  # └─ AI features
│       │   │       └── reports.ts    #   └─ Analytics
│       │   │
│       │   ├── realtime/
│       │   │   └── event-emitter.ts  # SSE broadcast system
│       │   │
│       │   ├── stores/               # Zustand state management
│       │   │   ├── order-store.ts    #   └─ Current order state
│       │   │   └── ui-store.ts       #   └─ UI preferences
│       │   │
│       │   └── hooks/
│       │       ├── use-realtime.ts   # Real-time event subscription
│       │       └── use-pwa.ts        # PWA install & offline
│       │
│       └── public/
│           ├── manifest.json         # PWA manifest
│           └── sw.js                 # Service worker
│
├── packages/
│   │
│   ├── database/                     # Prisma ORM
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # Database schema (40+ models)
│   │   │   └── seed.ts               # Demo data seeder
│   │   └── src/
│   │       └── client.ts             # Prisma client export
│   │
│   ├── types/                        # Shared TypeScript
│   │   └── src/
│   │       ├── index.ts              # Type exports
│   │       ├── schemas.ts            # Zod validation schemas
│   │       └── permissions.ts        # Role permission constants
│   │
│   ├── config/                       # Shared Configuration
│   │   └── src/
│   │       └── index.ts              # App constants
│   │
│   └── ai/                           # Anthropic Claude Integration
│       └── src/
│           ├── client.ts             # AI client setup
│           ├── prompts.ts            # System prompts (industry lingo)
│           ├── query.ts              # Natural language queries
│           ├── specials.ts           # AI daily specials
│           ├── prep.ts               # AI prep list generation
│           ├── tips.ts               # Tip optimization insights
│           └── alternatives.ts       # 86 alternative suggestions
│
├── .env.example                      # Environment template
├── .env.local                        # Your local config (git-ignored)
├── package.json                      # Root package manifest
├── pnpm-workspace.yaml               # Monorepo workspace config
├── turbo.json                        # Turborepo build config
├── CLAUDE.md                         # AI assistant context
├── SETUP.md                          # ← You are here
└── mise-pos-readme.md                # Project overview
```

---

## Application Routes

| Route | Purpose |
|-------|---------|
| `/login` | Email/password authentication |
| `/pin` | PIN-based terminal login |
| `/terminal` | POS order entry |
| `/kitchen` | Kitchen Display System |
| `/dashboard` | Manager dashboard & AI queries |
| `/staff` | Staff hub & daily briefing |

---

## API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/api/trpc/*` | tRPC API (type-safe) |
| `/api/sse/[locationId]` | Real-time events (SSE) |
| `/api/auth/*` | NextAuth.js handlers |

---

## Troubleshooting

### Database connection failed
```bash
# Check if Postgres is running
docker ps | grep mise-postgres

# If not running, start it
docker start mise-postgres
```

### Prisma client out of sync
```bash
pnpm db:generate
```

### Port 3000 in use
```bash
# Find and kill the process
lsof -i :3000
kill -9 <PID>
```

### Reset everything
```bash
docker stop mise-postgres && docker rm mise-postgres
pnpm clean
# Then start fresh from Quick Start
```

---

## Tech Stack Reference

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript (strict) |
| Styling | TailwindCSS |
| UI Components | shadcn/ui + Radix |
| State (client) | Zustand |
| State (server) | TanStack Query |
| API | tRPC |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | NextAuth.js |
| AI | Anthropic Claude |
| Real-time | Server-Sent Events |
| PWA | Service Worker |

---

*"Mise en place — everything in its place."*
