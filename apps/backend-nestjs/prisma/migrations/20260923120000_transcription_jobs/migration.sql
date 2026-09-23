-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- AlterTable
ALTER TABLE "interviews" ADD COLUMN     "language" TEXT;

-- AlterTable
ALTER TABLE "transcript_segments" ADD COLUMN     "confidence" DOUBLE PRECISION,
ADD COLUMN     "edited_at" TIMESTAMP(3),
ADD COLUMN     "edited_by_id" TEXT,
ADD COLUMN     "edited_text" TEXT,
ADD COLUMN     "translated_text" TEXT;

-- AlterTable
ALTER TABLE "transcripts" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "duration_ms" INTEGER,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "next_attempt_at" TIMESTAMP(3),
ADD COLUMN     "processing_ms" INTEGER,
ADD COLUMN     "requested_language" TEXT,
ADD COLUMN     "text" TEXT,
ADD COLUMN     "translated_at" TIMESTAMP(3),
ADD COLUMN     "translation_error" TEXT,
ADD COLUMN     "translation_language" TEXT,
ADD COLUMN     "translation_model" TEXT,
ADD COLUMN     "translation_status" "TranscriptStatus";

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "dedupe_key" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 6,
    "run_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_at" TIMESTAMP(3),
    "locked_by" TEXT,
    "last_error" TEXT,
    "completed_at" TIMESTAMP(3),
    "organization_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "jobs_status_run_at_idx" ON "jobs"("status", "run_at");

-- CreateIndex
CREATE INDEX "jobs_organization_id_idx" ON "jobs"("organization_id");

-- CreateIndex
CREATE INDEX "jobs_dedupe_key_idx" ON "jobs"("dedupe_key");

-- AddForeignKey
ALTER TABLE "transcript_segments" ADD CONSTRAINT "transcript_segments_edited_by_id_fkey" FOREIGN KEY ("edited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Data: recordings and transcripts are administrator-only (decision
-- 2026-09-23). ROLE_DEFINITIONS no longer grants these permissions to the
-- other system roles; provisioning only ever adds grants, so existing
-- organizations are brought in line here. Administrators keep them.
DELETE FROM "permission_role" pr
USING "roles" r, "permissions" p
WHERE pr."role_id" = r."id"
  AND pr."permission_id" = p."id"
  AND r."is_system" = true
  AND r."slug" IN ('research-lead', 'researcher', 'reviewer', 'field-interviewer')
  AND p."slug" IN ('view.recordings', 'view.transcripts', 'create.transcripts', 'edit.transcripts');
