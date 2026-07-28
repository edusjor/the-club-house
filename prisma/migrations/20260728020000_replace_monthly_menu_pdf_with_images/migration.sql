-- DropTable
DROP TABLE "MonthlyMenuPdf";

-- CreateTable
CREATE TABLE "MonthlyMenuImage" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyMenuImage_pkey" PRIMARY KEY ("id")
);
