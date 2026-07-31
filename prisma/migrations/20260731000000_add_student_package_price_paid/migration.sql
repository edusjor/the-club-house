-- AlterTable
ALTER TABLE "StudentPackage" ADD COLUMN     "pricePaid" INTEGER NOT NULL DEFAULT 0;

-- Backfill existing rows with the price they would have been charged at
-- purchase time, using the same level-normalization rules as the app
-- (normalizePriceLevel in src/lib/utils.ts).
UPDATE "StudentPackage" sp
SET "pricePaid" = pp.price
FROM "Student" s, "PackagePrice" pp
WHERE sp."studentId" = s.id
  AND pp."packageId" = sp."packageId"
  AND pp.level = (
    CASE UPPER(TRIM(s.level))
      WHEN 'PRESCHOOL' THEN 'ELEMENTARY'
      WHEN 'PRIMARIA' THEN 'ELEMENTARY'
      WHEN 'PRIMARY' THEN 'ELEMENTARY'
      WHEN 'MIDDLE' THEN 'MIDDLE_HIGH'
      WHEN 'SECONDARY' THEN 'MIDDLE_HIGH'
      WHEN 'SECUNDARIA' THEN 'MIDDLE_HIGH'
      WHEN 'ADULT' THEN 'STAFF'
      WHEN 'PERSONAL' THEN 'STAFF'
      WHEN 'ATHLETE' THEN 'ATHLETES'
      WHEN 'DEPORTISTAS' THEN 'ATHLETES'
      ELSE UPPER(TRIM(s.level))
    END
  )
  AND sp."pricePaid" = 0;
