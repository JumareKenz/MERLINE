-- CreateEnum
CREATE TYPE "AnalysisReportScope" AS ENUM ('INTERVIEW', 'PROJECT', 'CUSTOM');

-- AlterTable
ALTER TABLE "interviews" ADD COLUMN     "type" TEXT;

-- CreateTable
CREATE TABLE "analysis_reports" (
    "id" TEXT NOT NULL,
    "scope" "AnalysisReportScope" NOT NULL,
    "status" "TranscriptStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "content" JSONB,
    "model" TEXT,
    "prompt_version" TEXT,
    "error_message" TEXT,
    "source_count" INTEGER NOT NULL DEFAULT 0,
    "project_id" TEXT,
    "interview_id" TEXT,
    "transcript_id" TEXT,
    "organization_id" TEXT NOT NULL,
    "requested_by_id" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "analysis_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analysis_reports_organization_id_idx" ON "analysis_reports"("organization_id");

-- CreateIndex
CREATE INDEX "analysis_reports_project_id_idx" ON "analysis_reports"("project_id");

-- CreateIndex
CREATE INDEX "analysis_reports_interview_id_idx" ON "analysis_reports"("interview_id");

-- AddForeignKey
ALTER TABLE "analysis_reports" ADD CONSTRAINT "analysis_reports_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_reports" ADD CONSTRAINT "analysis_reports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_reports" ADD CONSTRAINT "analysis_reports_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "interviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_reports" ADD CONSTRAINT "analysis_reports_transcript_id_fkey" FOREIGN KEY ("transcript_id") REFERENCES "transcripts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_reports" ADD CONSTRAINT "analysis_reports_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Data: existing interviews take their project's method as their type.
UPDATE "interviews" i
SET "type" = p."settings"->>'method'
FROM "projects" p
WHERE i."project_id" = p."id"
  AND i."type" IS NULL
  AND p."settings"->>'method' IN ('KII', 'FGD', 'IDI', 'OTHER');
