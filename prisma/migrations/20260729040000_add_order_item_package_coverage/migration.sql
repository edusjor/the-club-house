-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "coveredByStudentPackageId" TEXT;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_coveredByStudentPackageId_fkey" FOREIGN KEY ("coveredByStudentPackageId") REFERENCES "StudentPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
