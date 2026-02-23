# Verify PostgreSQL on Windows 10

## 1. Check the Windows service

1. Press **Win + R**, type **`services.msc`**, press Enter.
2. In the list, find **PostgreSQL** (e.g. `postgresql-x64-16` or `postgresql-x64-17`).
3. Check:
   - **Status** = **Running**
   - **Startup type** = **Automatic**

If it’s not running: right‑click → **Start**.

---

## 2. Test connection from Command Prompt or PowerShell

Open **Command Prompt** or **PowerShell** and run:

```bash
psql -U postgres -h localhost -c "SELECT version();"
```

- It will ask for the **postgres user password** (the one you set during install).
- If it works, you’ll see a line with the PostgreSQL version (e.g. `PostgreSQL 17.x`).

**If `psql` is not found:**

- Add PostgreSQL to PATH, or use the full path, for example:
  ```bash
  "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -h localhost -c "SELECT version();"
  ```
  (Change `17` to your version if different.)

---

## 3. Verify from your project (Prisma)

In your project folder:

```bash
cd c:\projects\b2bsites
npx prisma db push
```

- If `.env` has the correct `DATABASE_URL` and PostgreSQL is running, this will create/update tables and complete without connection errors.
- Alternatively: **npx prisma db pull** (just connects and reads schema; no changes). If it runs without error, PostgreSQL is reachable.

---

## Quick summary

| Check              | How                                      |
|--------------------|------------------------------------------|
| Service running    | `services.msc` → PostgreSQL = Running   |
| Command-line login | `psql -U postgres -h localhost -c "SELECT 1;"` |
| App can connect    | `npx prisma db push` (or `db pull`) in project |
