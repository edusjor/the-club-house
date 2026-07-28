-- AlterTable
ALTER TABLE "FoodItem" ADD COLUMN     "fixedMealPeriod" TEXT;

-- CreateTable
CREATE TABLE "MonthlyMenuPdf" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "url" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyMenuPdf_pkey" PRIMARY KEY ("id")
);
