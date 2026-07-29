-- DropForeignKey
ALTER TABLE "Consumption" DROP CONSTRAINT "Consumption_studentId_fkey";
ALTER TABLE "Consumption" DROP CONSTRAINT "Consumption_foodItemId_fkey";
ALTER TABLE "Consumption" DROP CONSTRAINT "Consumption_studentPackageId_fkey";
ALTER TABLE "Consumption" DROP CONSTRAINT "Consumption_registeredById_fkey";

-- DropTable
DROP TABLE "Consumption";

-- AlterTable
ALTER TABLE "StudentPackage" DROP COLUMN "remaining";

-- AlterTable
ALTER TABLE "PackageItem" DROP COLUMN "quantity";
