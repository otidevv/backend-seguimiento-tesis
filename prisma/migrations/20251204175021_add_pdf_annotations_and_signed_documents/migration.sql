-- CreateEnum
CREATE TYPE "AnnotationType" AS ENUM ('HIGHLIGHT', 'RECTANGLE', 'TEXT_COMMENT');

-- CreateTable
CREATE TABLE "pdf_annotations" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "thesisId" TEXT NOT NULL,
    "type" "AnnotationType" NOT NULL,
    "content" TEXT,
    "color" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "textRanges" TEXT,
    "x" DOUBLE PRECISION,
    "y" DOUBLE PRECISION,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pdf_annotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "annotation_replies" (
    "id" TEXT NOT NULL,
    "annotationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "annotation_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signed_documents" (
    "id" TEXT NOT NULL,
    "thesisId" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signed_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pdf_annotations_documentId_idx" ON "pdf_annotations"("documentId");

-- CreateIndex
CREATE INDEX "pdf_annotations_thesisId_idx" ON "pdf_annotations"("thesisId");

-- CreateIndex
CREATE INDEX "annotation_replies_annotationId_idx" ON "annotation_replies"("annotationId");

-- CreateIndex
CREATE INDEX "signed_documents_thesisId_idx" ON "signed_documents"("thesisId");

-- AddForeignKey
ALTER TABLE "pdf_annotations" ADD CONSTRAINT "pdf_annotations_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_annotations" ADD CONSTRAINT "pdf_annotations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_annotations" ADD CONSTRAINT "pdf_annotations_thesisId_fkey" FOREIGN KEY ("thesisId") REFERENCES "theses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annotation_replies" ADD CONSTRAINT "annotation_replies_annotationId_fkey" FOREIGN KEY ("annotationId") REFERENCES "pdf_annotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annotation_replies" ADD CONSTRAINT "annotation_replies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signed_documents" ADD CONSTRAINT "signed_documents_thesisId_fkey" FOREIGN KEY ("thesisId") REFERENCES "theses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signed_documents" ADD CONSTRAINT "signed_documents_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
