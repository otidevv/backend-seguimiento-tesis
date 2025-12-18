-- AlterTable
ALTER TABLE "theses" ADD COLUMN     "coAuthorId" TEXT;

-- AddForeignKey
ALTER TABLE "theses" ADD CONSTRAINT "theses_coAuthorId_fkey" FOREIGN KEY ("coAuthorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
