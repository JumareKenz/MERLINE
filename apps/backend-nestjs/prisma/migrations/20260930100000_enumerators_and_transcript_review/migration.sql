-- CreateEnum
CREATE TYPE "AccessCodeStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "TranscriptReviewStatus" AS ENUM ('RECORDING_SUBMITTED', 'TRANSCRIPTION_PROCESSING', 'AVAILABLE_FOR_REVIEW', 'ENUMERATOR_EDITING', 'SUBMITTED_FOR_ADMIN_REVIEW', 'RETURNED_FOR_CORRECTION', 'APPROVED', 'LOCKED');

-- CreateEnum
CREATE TYPE "RevisionKind" AS ENUM ('MACHINE', 'ENUMERATOR', 'ADMIN', 'APPROVED');

-- AlterTable
ALTER TABLE "interviews" ADD COLUMN     "type_metadata" JSONB;

-- AlterTable
ALTER TABLE "transcripts" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by_id" TEXT,
ADD COLUMN     "approved_revision_id" TEXT,
ADD COLUMN     "locked_at" TIMESTAMP(3),
ADD COLUMN     "review_note" TEXT,
ADD COLUMN     "review_status" "TranscriptReviewStatus" NOT NULL DEFAULT 'RECORDING_SUBMITTED',
ADD COLUMN     "review_submitted_at" TIMESTAMP(3),
ADD COLUMN     "review_submitted_by_id" TEXT;

-- AlterTable
ALTER TABLE "transcript_segments" ADD COLUMN     "edited_speaker_label" TEXT,
ADD COLUMN     "flag_reason" TEXT,
ADD COLUMN     "flagged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "review_note" TEXT;

-- CreateTable
CREATE TABLE "enumerator_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "unique_id" TEXT NOT NULL,
    "state" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enumerator_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_access_codes" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "status" "AccessCodeStatus" NOT NULL DEFAULT 'ACTIVE',
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issued_by_id" TEXT,
    "expires_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),
    "use_count" INTEGER NOT NULL DEFAULT 0,
    "revoked_at" TIMESTAMP(3),
    "revoked_by_id" TEXT,
    "revoked_reason" TEXT,

    CONSTRAINT "field_access_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_interview_types" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "fields" JSONB NOT NULL DEFAULT '[]',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_interview_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcript_revisions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "transcript_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "kind" "RevisionKind" NOT NULL,
    "author_id" TEXT,
    "note" TEXT,
    "segments" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transcript_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcript_review_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "transcript_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "from_status" "TranscriptReviewStatus",
    "to_status" "TranscriptReviewStatus" NOT NULL,
    "actor_id" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transcript_review_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_sources" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "transcript_id" TEXT NOT NULL,
    "revision_id" TEXT,
    "interview_id" TEXT NOT NULL,
    "interview_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "enumerator_profiles_user_id_key" ON "enumerator_profiles"("user_id");

-- CreateIndex
CREATE INDEX "enumerator_profiles_organization_id_idx" ON "enumerator_profiles"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "enumerator_profiles_organization_id_unique_id_key" ON "enumerator_profiles"("organization_id", "unique_id");

-- CreateIndex
CREATE UNIQUE INDEX "field_access_codes_code_hash_key" ON "field_access_codes"("code_hash");

-- CreateIndex
CREATE INDEX "field_access_codes_organization_id_idx" ON "field_access_codes"("organization_id");

-- CreateIndex
CREATE INDEX "field_access_codes_user_id_idx" ON "field_access_codes"("user_id");

-- CreateIndex
CREATE INDEX "project_interview_types_organization_id_idx" ON "project_interview_types"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_interview_types_project_id_key_key" ON "project_interview_types"("project_id", "key");

-- CreateIndex
CREATE INDEX "transcript_revisions_organization_id_idx" ON "transcript_revisions"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "transcript_revisions_transcript_id_number_key" ON "transcript_revisions"("transcript_id", "number");

-- CreateIndex
CREATE INDEX "transcript_review_events_organization_id_idx" ON "transcript_review_events"("organization_id");

-- CreateIndex
CREATE INDEX "transcript_review_events_transcript_id_idx" ON "transcript_review_events"("transcript_id");

-- CreateIndex
CREATE INDEX "report_sources_transcript_id_idx" ON "report_sources"("transcript_id");

-- CreateIndex
CREATE UNIQUE INDEX "report_sources_report_id_transcript_id_key" ON "report_sources"("report_id", "transcript_id");

-- CreateIndex
CREATE INDEX "transcripts_organization_id_review_status_idx" ON "transcripts"("organization_id", "review_status");

-- AddForeignKey
ALTER TABLE "enumerator_profiles" ADD CONSTRAINT "enumerator_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enumerator_profiles" ADD CONSTRAINT "enumerator_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_access_codes" ADD CONSTRAINT "field_access_codes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_access_codes" ADD CONSTRAINT "field_access_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_access_codes" ADD CONSTRAINT "field_access_codes_issued_by_id_fkey" FOREIGN KEY ("issued_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_access_codes" ADD CONSTRAINT "field_access_codes_revoked_by_id_fkey" FOREIGN KEY ("revoked_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_interview_types" ADD CONSTRAINT "project_interview_types_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_interview_types" ADD CONSTRAINT "project_interview_types_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcript_revisions" ADD CONSTRAINT "transcript_revisions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcript_revisions" ADD CONSTRAINT "transcript_revisions_transcript_id_fkey" FOREIGN KEY ("transcript_id") REFERENCES "transcripts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcript_revisions" ADD CONSTRAINT "transcript_revisions_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcript_review_events" ADD CONSTRAINT "transcript_review_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcript_review_events" ADD CONSTRAINT "transcript_review_events_transcript_id_fkey" FOREIGN KEY ("transcript_id") REFERENCES "transcripts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcript_review_events" ADD CONSTRAINT "transcript_review_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_sources" ADD CONSTRAINT "report_sources_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "analysis_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_sources" ADD CONSTRAINT "report_sources_transcript_id_fkey" FOREIGN KEY ("transcript_id") REFERENCES "transcripts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ─── Data: additive backfills; nothing existing is changed or removed ───

-- One active access code per enumerator.
CREATE UNIQUE INDEX "field_access_codes_one_active_per_user"
  ON "field_access_codes" ("user_id") WHERE "status" = 'ACTIVE';

-- Existing field accounts (shared access codes) become enumerator records.
-- Their old plaintext code keeps working until an administrator issues a
-- personal one; nothing is deleted here.
INSERT INTO "enumerator_profiles" ("id", "user_id", "organization_id", "unique_id", "updated_at")
SELECT gen_random_uuid()::text, u."id", u."organization_id",
       'ENU-' || upper(substr(md5(u."id"), 1, 6)),
       now() AT TIME ZONE 'UTC'
FROM "users" u
WHERE u."deleted_at" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "enumerator_profiles" p WHERE p."user_id" = u."id")
  AND EXISTS (
    SELECT 1 FROM "role_user" ru JOIN "roles" r ON r."id" = ru."role_id"
    WHERE ru."user_id" = u."id" AND r."slug" = 'field-interviewer'
  );

-- Review status follows machine processing for transcripts that exist today.
-- Completed transcripts become AVAILABLE_FOR_REVIEW, not APPROVED: nobody has
-- yet reviewed them under the new workflow, and approval must be a human act.
UPDATE "transcripts" SET "review_status" = 'AVAILABLE_FOR_REVIEW' WHERE "status" = 'COMPLETED' AND "review_status" = 'RECORDING_SUBMITTED';
UPDATE "transcripts" SET "review_status" = 'TRANSCRIPTION_PROCESSING' WHERE "status" = 'PROCESSING' AND "review_status" = 'RECORDING_SUBMITTED';

-- Revision 1 (the machine text, exactly as transcribed) for existing transcripts.
INSERT INTO "transcript_revisions" ("id", "organization_id", "transcript_id", "number", "kind", "note", "segments", "created_at")
SELECT gen_random_uuid()::text, t."organization_id", t."id", 1, 'MACHINE', 'Machine transcript',
       COALESCE((
         SELECT jsonb_agg(jsonb_build_object(
           'index', s."index", 'startMs', s."start_ms", 'endMs', s."end_ms",
           'speaker', s."speaker_label", 'text', s."text", 'confidence', s."confidence",
           'flagged', false, 'flagReason', NULL, 'note', NULL) ORDER BY s."index")
         FROM "transcript_segments" s WHERE s."transcript_id" = t."id"), '[]'::jsonb),
       COALESCE(t."completed_at", now() AT TIME ZONE 'UTC')
FROM "transcripts" t
WHERE t."status" = 'COMPLETED'
  AND NOT EXISTS (SELECT 1 FROM "transcript_revisions" r WHERE r."transcript_id" = t."id" AND r."number" = 1);
