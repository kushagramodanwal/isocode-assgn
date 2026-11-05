# Jabalpur FMCG Retailer Ordering Platform

A mobile-first FMCG retailer ordering and distributor order desk platform serving Kirana store owners and distributor staff in Jabalpur.

Built in accordance with `PROJECT_SPEC.md` using React, Vite, TypeScript, Tailwind CSS, TanStack Query, Node.js Express, PostgreSQL, Prisma, and Zod.

---

## Architecture Overview

```
isocode0/
├── apps/
│   ├── web/                      React + Vite mobile-first PWA-ready client
│   │   └── src/
│   │       ├── features/         auth, catalogue, cart, orders, ai-draft, desk
│   │       ├── components/       shared design primitives (Stepper, Money, Badges, etc.)
│   │       ├── styles/           tokens.css (design system tokens)
│   │       ├── lib/              API client, TanStack Query client
│   │       └── i18n/             en.ts, hi.ts (Hindi & English translations)
│   └── api/                      Express + TypeScript modular backend
│       ├── prisma/               schema.prisma, seed.ts
│       └── src/
│           ├── platform/         config, logger, prisma, errors, bigint, adapters/
│           ├── middleware/       session, requireRole, validate, idempotency, originCheck
│           ├── modules/          auth, catalogue, orders, notifications, ai-capture, desk, exports
│           └── server.ts
├── packages/
│   └── domain/                   Pure domain business logic (no I/O)
│       ├── scheme-engine/        Buy-N-Get-M and Slab discount calculations
│       ├── money.ts              Integer paise arithmetic & formatting
│       ├── normalise.ts          Hinglish vocabulary normalisation
│       └── schemas.ts            Shared Zod validation schemas
├── docker-compose.yml            PostgreSQL 16 container definition
├── deployment.md                 Demo accounts, test walks, and mocks register
└── README.md
```

---

## Core Engineering Rules Followed

1. **Server-Side Price & Scheme Authority**: Client-side prices in request bodies are ignored. The server re-computes authoritative prices, schemes, and stock before persistence.
2. **Integer Paise Only**: All monetary values are represented as integer paise (`BigInt` / integer paise). Zero floating-point arithmetic.
3. **Optimistic & Row Locking Concurrency**:
   - Stock allocations on order approval lock stock rows in ascending order using PostgreSQL `SELECT ... FOR UPDATE` row locks to prevent deadlocks and race conditions.
   - Order edits use optimistic locking via `version` number and `If-Match` headers.
4. **Order Idempotency**: Order placement requires the `Idempotency-Key` header with database unique constraints on `(placedByUserId, idempotencyKey)`.
5. **AI Draft & Confirmation Safety**: AI outputs are strictly treated as drafts. Confirmation by a human retailer is mandatory before an order can be created. Prices, stocks, and schemes are annotated strictly by backend services.
6. **Retailer Data Isolation**: Retailer-scoped queries strictly enforce `retailerId` checks; records belonging to another retailer return `404 Not Found` rather than `403 Forbidden` to prevent ID harvesting.
7. **Default-Deny Role Security**: Every route declares its allowed roles (`['retailer']`, `['desk']`). Verified via automated startup test suite.
8. **Labelled Mocks**: Simulated messaging, payments, and Tally exports are explicitly labelled with badges across the UI and documented in `deployment.md`.

---

## Quick Start Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```
Default connection string: `postgresql://postgres:postgres@localhost:5432/retailer_db`.

### 3. Database Migration & Seed
```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 4. Run Development Servers
```bash
# Terminal 1: API Server (port 4000)
npm run dev:api

# Terminal 2: Web Client (port 5173)
npm run dev:web
```

Visit [http://localhost:5173](http://localhost:5173).

---

## Test Suite Execution

Run the complete test suite across all packages (Domain, API, Web):
```bash
npm test
```

### Tests Covered:
- **Scheme Engine**: Thresholds at N and N-1, multiples of N, slab boundaries, rounding down at paisa boundaries, retailer scoping, expired schemes, stock shortages, unknown scheme validation.
- **Money & BigInt**: Exact paise conversion, basis points discounts, JSON BigInt serialisation.
- **Normalisation**: Hinglish vocabulary normalisation, filler stripping, alias preservation.
- **Order States**: All legal and illegal state transitions across the order lifecycle.
- **Startup & Route Guards**: Production mode DEV_OTP guard, default-deny role checks on all routes.
- **UI States**: Loading skeletons, meaningful empty states, and plain-language error states with retry actions using React Testing Library.
