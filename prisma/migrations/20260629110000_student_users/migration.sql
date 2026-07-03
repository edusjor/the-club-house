PRAGMA foreign_keys=OFF;

-- Backfill one user account per existing student.
INSERT INTO "User" ("id", "name", "email", "password", "role", "active", "createdAt", "updatedAt")
SELECT
  'student_' || "id",
  "name",
  'student+' || "id" || '@theclubhouse.local',
  '',
  'STUDENT',
  false,
  "createdAt",
  "updatedAt"
FROM "Student";

CREATE TABLE "new_Student" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "grade" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "allergies" TEXT,
  "restrictions" TEXT,
  "medicalNotes" TEXT,
  "photo" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "parentId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Student_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Student" (
  "id", "userId", "name", "grade", "level", "allergies", "restrictions", "medicalNotes", "photo", "active", "parentId", "createdAt", "updatedAt"
)
SELECT
  "id",
  'student_' || "id",
  "name",
  "grade",
  "level",
  "allergies",
  "restrictions",
  "medicalNotes",
  "photo",
  "active",
  "parentId",
  "createdAt",
  "updatedAt"
FROM "Student";

DROP TABLE "Student";
ALTER TABLE "new_Student" RENAME TO "Student";

CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
