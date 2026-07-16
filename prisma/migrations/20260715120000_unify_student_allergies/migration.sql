-- Merge "restrictions" into "allergies" before dropping the column
UPDATE "Student"
SET "allergies" = CASE
  WHEN "allergies" IS NULL OR "allergies" = '' THEN "restrictions"
  WHEN "restrictions" IS NULL OR "restrictions" = '' THEN "allergies"
  ELSE "allergies" || ', ' || "restrictions"
END
WHERE "restrictions" IS NOT NULL AND "restrictions" <> '';

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "restrictions",
DROP COLUMN "medicalNotes";
