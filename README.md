# Time Tracker

Minimal Clockify-like time tracker (V1) built on Next.js App Router, Postgres + Prisma, NextAuth v5, and TanStack Query. Designed so a future ClickUp integration (V2) is purely additive: ClickUp schema fields and AES-256-GCM token encryption already ship in V1.

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript (strict)
- PostgreSQL · Prisma ORM
- NextAuth v5 (Credentials) · bcryptjs · JWT sessions
- TanStack Query · react-hook-form · Zod
- Tailwind CSS v4 · sonner

## Setup

Five commands to a running dev environment:

```bash
npm install
cp .env.example .env         # then edit DATABASE_URL, AUTH_SECRET, TOKEN_ENCRYPTION_KEY
npm run db:migrate           # creates schema and applies migrations
npm run db:seed              # loads admin/alice/bob + tasks + entries
npm run dev
```

### Database (Neon)

1. Create a free project at https://neon.tech.
2. On the project dashboard → **Connection Details**, uncheck **"Connection pooling"** to reveal the direct connection string (host without `-pooler`).
3. Copy that string into `.env` as `DATABASE_URL`.

Why the direct URL: `prisma migrate` needs a persistent connection (DDL doesn't survive a pooler). For local Postgres any connection string works.

Open http://localhost:3000.

### Generating secrets

```bash
openssl rand -base64 32      # use for AUTH_SECRET
openssl rand -base64 32      # use for TOKEN_ENCRYPTION_KEY (must decode to 32 bytes)
```

The encryption key is validated on every process start — verify with `npm run test:encryption`.

## Test credentials (after `pnpm db:seed`)

| Email              | Password    | Role   | Timezone    |
| ------------------ | ----------- | ------ | ----------- |
| `admin@test.com`   | `Admin123!` | ADMIN  | Asia/Dhaka  |
| `alice@test.com`   | `Alice123!` | MEMBER | Asia/Dhaka  |
| `bob@test.com`     | `Bob123!`   | MEMBER | UTC         |

## Scripts

```
npm run dev                 # Next.js dev server
npm run build / npm start   # Production build / run
npm run typecheck           # tsc --noEmit
npm run lint                # eslint
npm run db:migrate          # prisma migrate dev
npm run db:seed             # idempotent seed (upserts)
npm run db:studio           # Prisma Studio
npm run db:reset            # drop + migrate + seed
npm run test:encryption     # round-trip check for TOKEN_ENCRYPTION_KEY
```

## Architecture

```
src/
  app/              # Next.js App Router (pages + /api route handlers)
  features/         # feature modules (hooks, components, schemas)
  server/services/  # backend business logic, called by route handlers
  lib/              # prisma, auth, api-error, dates, encryption, validation
prisma/
  schema.prisma     # V1 + V2 ClickUp-ready schema
  migrations/
  seed.ts
scripts/
  test-encryption.ts
docs/
  V2_CLICKUP_SYNC_STRATEGY.md
```

**Why V2 infra ships in V1:** AES-256-GCM token encryption and all ClickUp schema fields exist now so the V2 integration can be added without schema migrations, refactors, or service-signature breaks. V2 uses Vercel-native primitives (Cron Jobs + serverless route handlers) for background work — no separate worker process. See `docs/V2_CLICKUP_SYNC_STRATEGY.md`.

## V1 scope

In: auth, tasks, start/stop timer, manual entry, dashboard, calendar, reports, admin team page.
Out: ClickUp sync, password reset, email, exports, mobile, workspaces/orgs.
