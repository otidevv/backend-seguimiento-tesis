/*
  Warnings:

  - A unique constraint covering the columns `[externalName]` on the table `careers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[externalName]` on the table `faculties` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "careers" ADD COLUMN     "externalName" TEXT;

-- AlterTable
ALTER TABLE "faculties" ADD COLUMN     "externalName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "careers_externalName_key" ON "careers"("externalName");

-- CreateIndex
CREATE UNIQUE INDEX "faculties_externalName_key" ON "faculties"("externalName");
