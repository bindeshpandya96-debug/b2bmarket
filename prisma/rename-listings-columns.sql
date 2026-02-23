-- Run this in PostgreSQL to rename columns so they match the Prisma @map names.
-- Then run: npx prisma db push
-- Use one of the two blocks below depending on your PostgreSQL column names.

-- If your columns are camelCase (e.g. "hospitalId", "createdAt", "updatedAt"):
ALTER TABLE listings RENAME COLUMN "hospitalId" TO hospital_id;
ALTER TABLE listings RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE listings RENAME COLUMN "updatedAt" TO updated_at;

-- If the above fails (columns might be lowercase "hospitalid", "createdat", "updatedat"), try:
-- ALTER TABLE listings RENAME COLUMN hospitalid TO hospital_id;
-- ALTER TABLE listings RENAME COLUMN createdat TO created_at;
-- ALTER TABLE listings RENAME COLUMN updatedat TO updated_at;
