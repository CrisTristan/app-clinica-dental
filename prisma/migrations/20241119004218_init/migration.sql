/*
  Warnings:

  - You are about to drop the `Account` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_userId_fkey";

-- DropTable
DROP TABLE "Account";

-- CreateTable
CREATE TABLE "DentalData" (
    "id" SERIAL NOT NULL,
    "examenTejidos" JSONB NOT NULL,
    "nameId" INTEGER NOT NULL,

    CONSTRAINT "DentalData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DentalData_nameId_key" ON "DentalData"("nameId");

-- AddForeignKey
ALTER TABLE "DentalData" ADD CONSTRAINT "DentalData_nameId_fkey" FOREIGN KEY ("nameId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
