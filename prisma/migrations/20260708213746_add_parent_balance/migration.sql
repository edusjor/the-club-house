-- CreateTable
CREATE TABLE "ParentBalance" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "pendingBalance" INTEGER NOT NULL DEFAULT 0,
    "approvedBalance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentBalance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParentBalance_parentId_key" ON "ParentBalance"("parentId");

-- AddForeignKey
ALTER TABLE "ParentBalance" ADD CONSTRAINT "ParentBalance_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
