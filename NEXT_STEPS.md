# Next steps (run in order)

You already ran `npm install`. Do the following **in order**:

## 1. Create `.env`

```bash
copy .env.example .env
```

Edit `.env` and set your PostgreSQL URL:

```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/b2bsites?schema=public"
ORDER_RESERVATION_TIMEOUT_MINUTES=60
```

(Use your real DB user, password, host, and database name.)

## 2. Generate Prisma client and create tables

```bash
npx prisma generate
npx prisma db push
```

- `prisma generate` — generates the TypeScript client from `prisma/schema.prisma`.
- `prisma db push` — creates/updates tables in your database (no migration files).  
  **PostgreSQL must be running** and `DATABASE_URL` must be correct.

## 3. (Optional) Seed test data

```bash
npm run db:seed
```

This creates two hospitals and three users. The script prints **headers** to use for API calls (e.g. in Postman or curl). Copy those for testing.

## 4. Run the app and see the UI

```bash
npm run dev
```

- Open **http://localhost:3000** — you’ll see the marketplace home and a list of active listings (empty until you create some via API or seed and then create listings).
- Use the seed headers to call the API (e.g. create listings as Hospital A, then search as Hospital B).

## 5. Quick API test (after seed)

With dev server running, use the IDs printed by `npm run db:seed`:

**Create a listing (Hospital A – ADMIN):**

```bash
curl -X POST http://localhost:3000/api/listings -H "Content-Type: application/json" -H "X-User-Id: <admin-a-user-id>" -H "X-Organization-Id: seed-hospital-a" -H "X-User-Role: ADMIN" -d "{\"title\":\"Surgical Gloves Box\",\"category\":\"Consumables\",\"quantityAvailable\":100,\"pricePerUnit\":25.50}"
```

**Search listings:**

```bash
curl http://localhost:3000/api/listings
```

---

**If something fails**

- **“Can’t reach database”** — Check PostgreSQL is running and `DATABASE_URL` in `.env`.
- **“Prisma client not generated”** — Run `npx prisma generate` again.
- **401 on POST /api/listings or /api/orders** — Add the three headers: `X-User-Id`, `X-Organization-Id`, `X-User-Role`.
- **Ant Design styles missing or flicker** — Run `npm i @ant-design/nextjs-registry @ant-design/v5-patch-for-react-19` and wrap the root layout body with `<AntdRegistry>{children}</AntdRegistry>` (see [Ant Design + Next.js](https://ant.design/docs/react/use-with-next)).
