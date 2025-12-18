-- AlterTable
ALTER TABLE "users" ADD COLUMN     "academicDepartment" TEXT,
ADD COLUMN     "facultyId" TEXT,
ADD COLUMN     "teacherCode" TEXT;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "faculties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
