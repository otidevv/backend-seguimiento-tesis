/*
  Warnings:

  - The values [USER,MODERATOR] on the enum `RoleEnum` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[documentNumber]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ThesisStatus" AS ENUM ('BORRADOR', 'PRESENTADA', 'REGISTRADA', 'DERIVADA_ESCUELA', 'COMISION_ASIGNADA', 'EN_EVALUACION', 'OBSERVADA', 'LEVANTANDO_OBS', 'APROBADA', 'RESOLUCION_EMITIDA', 'EN_DESARROLLO', 'EN_REVISION_FINAL', 'APTA_SUSTENTACION', 'SUSTENTADA', 'FINALIZADA', 'RECHAZADA', 'PLAZO_VENCIDO');

-- CreateEnum
CREATE TYPE "AcademicDegree" AS ENUM ('BACHILLER', 'LICENCIATURA', 'MAESTRIA', 'DOCTORADO');

-- CreateEnum
CREATE TYPE "JuryRole" AS ENUM ('PRESIDENTE', 'VOCAL', 'SECRETARIO', 'ACCESITARIO');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('APROBADO', 'OBSERVADO', 'RECHAZADO', 'PENDIENTE');

-- CreateEnum
CREATE TYPE "DeadlineType" AS ENUM ('EVALUACION_COMISION', 'LEVANTAMIENTO_OBS', 'AMPLIACION_OBS', 'REVISION_CORRECCION', 'SUSTENTACION');

-- CreateEnum
CREATE TYPE "DeadlineStatus" AS ENUM ('ACTIVO', 'CUMPLIDO', 'VENCIDO', 'CANCELADO', 'EXTENDIDO');

-- AlterEnum
BEGIN;
CREATE TYPE "RoleEnum_new" AS ENUM ('ADMIN', 'COORDINADOR', 'DOCENTE', 'ESTUDIANTE');
ALTER TABLE "roles" ALTER COLUMN "name" TYPE "RoleEnum_new" USING ("name"::text::"RoleEnum_new");
ALTER TYPE "RoleEnum" RENAME TO "RoleEnum_old";
ALTER TYPE "RoleEnum_new" RENAME TO "RoleEnum";
DROP TYPE "public"."RoleEnum_old";
COMMIT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "documentNumber" TEXT,
ADD COLUMN     "personalEmail" TEXT,
ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "faculties" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faculties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "careers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "facultyId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "careers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "careerId" TEXT NOT NULL,
    "studentCode" TEXT NOT NULL,
    "creditsApproved" DECIMAL(65,30),
    "lastAcademicPeriod" TEXT,
    "academicPeriodId" TEXT,
    "enrollmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "syncedFromExternalApi" BOOLEAN NOT NULL DEFAULT false,
    "externalApiData" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "theses" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ThesisStatus" NOT NULL DEFAULT 'BORRADOR',
    "academicDegree" "AcademicDegree" NOT NULL,
    "careerId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "coAdvisorId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proposalDate" TIMESTAMP(3),
    "approvalDate" TIMESTAMP(3),
    "defenseDate" TIMESTAMP(3),
    "finalDocument" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "theses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jury_members" (
    "id" TEXT NOT NULL,
    "thesisId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "JuryRole" NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jury_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" TEXT NOT NULL,
    "thesisId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "thesisId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "thesisId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "thesisId" TEXT NOT NULL,
    "juryMemberId" TEXT NOT NULL,
    "decision" "ReviewDecision" NOT NULL DEFAULT 'PENDIENTE',
    "observations" TEXT,
    "comments" TEXT,
    "reviewNumber" INTEGER NOT NULL DEFAULT 1,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thesis_status_history" (
    "id" TEXT NOT NULL,
    "thesisId" TEXT NOT NULL,
    "previousStatus" "ThesisStatus",
    "newStatus" "ThesisStatus" NOT NULL,
    "changedById" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thesis_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deadlines" (
    "id" TEXT NOT NULL,
    "thesisId" TEXT NOT NULL,
    "type" "DeadlineType" NOT NULL,
    "status" "DeadlineStatus" NOT NULL DEFAULT 'ACTIVO',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "businessDays" INTEGER,
    "calendarDays" INTEGER,
    "extensionOf" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deadlines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resolutions" (
    "id" TEXT NOT NULL,
    "thesisId" TEXT NOT NULL,
    "resolutionNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "documentUrl" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "issuedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resolutions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "faculties_name_key" ON "faculties"("name");

-- CreateIndex
CREATE UNIQUE INDEX "faculties_code_key" ON "faculties"("code");

-- CreateIndex
CREATE UNIQUE INDEX "careers_code_key" ON "careers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_studentCode_key" ON "enrollments"("studentCode");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_userId_careerId_key" ON "enrollments"("userId", "careerId");

-- CreateIndex
CREATE UNIQUE INDEX "jury_members_thesisId_role_key" ON "jury_members"("thesisId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "jury_members_thesisId_userId_key" ON "jury_members"("thesisId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_thesisId_juryMemberId_reviewNumber_key" ON "reviews"("thesisId", "juryMemberId", "reviewNumber");

-- CreateIndex
CREATE UNIQUE INDEX "resolutions_resolutionNumber_key" ON "resolutions"("resolutionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "users_documentNumber_key" ON "users"("documentNumber");

-- AddForeignKey
ALTER TABLE "careers" ADD CONSTRAINT "careers_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "faculties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_careerId_fkey" FOREIGN KEY ("careerId") REFERENCES "careers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theses" ADD CONSTRAINT "theses_careerId_fkey" FOREIGN KEY ("careerId") REFERENCES "careers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theses" ADD CONSTRAINT "theses_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theses" ADD CONSTRAINT "theses_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theses" ADD CONSTRAINT "theses_coAdvisorId_fkey" FOREIGN KEY ("coAdvisorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jury_members" ADD CONSTRAINT "jury_members_thesisId_fkey" FOREIGN KEY ("thesisId") REFERENCES "theses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jury_members" ADD CONSTRAINT "jury_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_thesisId_fkey" FOREIGN KEY ("thesisId") REFERENCES "theses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_thesisId_fkey" FOREIGN KEY ("thesisId") REFERENCES "theses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_thesisId_fkey" FOREIGN KEY ("thesisId") REFERENCES "theses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_thesisId_fkey" FOREIGN KEY ("thesisId") REFERENCES "theses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_juryMemberId_fkey" FOREIGN KEY ("juryMemberId") REFERENCES "jury_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thesis_status_history" ADD CONSTRAINT "thesis_status_history_thesisId_fkey" FOREIGN KEY ("thesisId") REFERENCES "theses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thesis_status_history" ADD CONSTRAINT "thesis_status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_thesisId_fkey" FOREIGN KEY ("thesisId") REFERENCES "theses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_extensionOf_fkey" FOREIGN KEY ("extensionOf") REFERENCES "deadlines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resolutions" ADD CONSTRAINT "resolutions_thesisId_fkey" FOREIGN KEY ("thesisId") REFERENCES "theses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resolutions" ADD CONSTRAINT "resolutions_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
