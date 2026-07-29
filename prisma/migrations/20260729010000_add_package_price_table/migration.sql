-- CreateTable
CREATE TABLE "PackagePrice" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "price" INTEGER NOT NULL,

    CONSTRAINT "PackagePrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PackagePrice_packageId_level_key" ON "PackagePrice"("packageId", "level");

-- AddForeignKey
ALTER TABLE "PackagePrice" ADD CONSTRAINT "PackagePrice_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
