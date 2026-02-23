# B2B Healthcare P2P Marketplace

Production-grade MVP: hospitals list surplus medical supplies; other hospitals discover and purchase them. **Backend is Node.js** (Next.js API routes + Prisma).

## Tech stack

- **Next.js** (App Router), **TypeScript**, **Prisma**, **PostgreSQL**, **Ant Design**

---

## What you need to do (your side)

1. **Create a PostgreSQL database** (local or cloud) and get its connection URL.
2. **Set environment variables:**
   ```bash
   cp .env.example .env
   ```
Edit `.env`:
  - `DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"`
  - `AUTH_SECRET=<at least 32 chars>` (e.g. run `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`)
  - `NEXTAUTH_URL=http://localhost:3000`
  - Optionally: `ORDER_RESERVATION_TIMEOUT_MINUTES=60`
3. **Install dependencies and apply schema:**
   ```bash
   cd c:\projects\b2bsites
   npm install
   npx prisma generate
   npx prisma db push
   ```
4. **Seed test data (optional):**
   ```bash
   npm run db:seed
   ```
   This creates two hospitals and users. Copy the printed headers to call the API.
5. **Run the app:**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000. Use the API with the dev headers (see below).

---

## API reference

All authenticated endpoints expect these **dev headers** (replace with real auth later):

- `X-User-Id` — User id (from seed or DB)
- `X-Organization-Id` — Hospital id
- `X-User-Role` — `ADMIN` or `PROCUREMENT`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Health check |
| GET | `/api/listings` | No | Search marketplace (query: `category`, `priceMin`, `priceMax`, `expiryAfter`, `page`, `pageSize`) |
| GET | `/api/listings/[id]` | No | Get one listing (only if ACTIVE and not expired) |
| POST | `/api/listings` | ADMIN | Create listing |
| PATCH | `/api/listings/[id]` | ADMIN | Update or deactivate listing (same hospital only) |
| POST | `/api/orders` | ADMIN, PROCUREMENT | Initiate purchase (body: `listingId`, `quantity`) → order RESERVED |
| GET | `/api/orders/my` | Yes | My orders (query: `?as=buyer` or `?as=seller`) |
| GET | `/api/orders/[id]` | Yes | Get order (buyer or seller only) |
| POST | `/api/orders/[id]/confirm` | Yes | Seller confirm (RESERVED → CONFIRMED) |
| POST | `/api/orders/[id]/reject` | Yes | Seller reject (stock restored) |
| POST | `/api/orders/[id]/cancel` | Yes | Buyer cancel (stock restored if RESERVED) |
| POST | `/api/orders/[id]/complete` | Yes | Seller mark COMPLETED (mock) |
| POST | `/api/cron/expire-orders` | No (or `CRON_SECRET` header if set in .env) | Expire RESERVED orders past timeout (call from cron) |

---

## What's next (after order is created)

See **[docs/WHATS_NEXT_AND_PENDING.md](./docs/WHATS_NEXT_AND_PENDING.md)** for:

- Trying **confirm / reject / cancel / complete** in Postman
- Setting up **expire-orders** cron (optional)
- What’s done vs optional on the dev side
- Production checklist and optional features

---

## Project structure and design

See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for:

- Folder structure (routes → services → repositories)
- Prisma schema and indexing strategy
- Order state machine and concurrency-safe purchase flow

---

## Scripts

- `npm run dev` — Start dev server
- `npm run build` / `npm run start` — Production
- `npm run db:generate` — Generate Prisma client
- `npm run db:push` — Push schema to DB (no migration files)
- `npm run db:migrate` — Create/run migrations
- `npm run db:seed` — Seed test orgs and users
- `npm run db:studio` — Open Prisma Studio
