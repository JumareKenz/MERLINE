-- CreateEnum
CREATE TYPE "QuestionSetStatus" AS ENUM ('DRAFT', 'APPROVED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "interviews" ADD COLUMN     "question_set_id" TEXT;

-- CreateTable
CREATE TABLE "question_sets" (
    "id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "interview_type" TEXT NOT NULL,
    "languages" TEXT[] DEFAULT ARRAY['en']::TEXT[],
    "status" "QuestionSetStatus" NOT NULL DEFAULT 'DRAFT',
    "project_id" TEXT,
    "organization_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "approved_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "question_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guide_questions" (
    "id" TEXT NOT NULL,
    "question_set_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "section" TEXT,
    "text" JSONB NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'OPEN',
    "options" JSONB NOT NULL DEFAULT '[]',
    "scale_min" INTEGER,
    "scale_max" INTEGER,
    "probes" JSONB NOT NULL DEFAULT '{}',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guide_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_question_logs" (
    "id" TEXT NOT NULL,
    "interview_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "at_ms" INTEGER,
    "recording_ref" TEXT,
    "note" TEXT,
    "marked_at" TIMESTAMP(3) NOT NULL,
    "organization_id" TEXT NOT NULL,
    "recorded_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_question_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "question_sets_organization_id_idx" ON "question_sets"("organization_id");

-- CreateIndex
CREATE INDEX "question_sets_project_id_idx" ON "question_sets"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "question_sets_family_id_version_key" ON "question_sets"("family_id", "version");

-- CreateIndex
CREATE INDEX "guide_questions_question_set_id_idx" ON "guide_questions"("question_set_id");

-- CreateIndex
CREATE INDEX "interview_question_logs_organization_id_idx" ON "interview_question_logs"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "interview_question_logs_interview_id_question_id_key" ON "interview_question_logs"("interview_id", "question_id");

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_question_set_id_fkey" FOREIGN KEY ("question_set_id") REFERENCES "question_sets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_sets" ADD CONSTRAINT "question_sets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_sets" ADD CONSTRAINT "question_sets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_sets" ADD CONSTRAINT "question_sets_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_sets" ADD CONSTRAINT "question_sets_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_questions" ADD CONSTRAINT "guide_questions_question_set_id_fkey" FOREIGN KEY ("question_set_id") REFERENCES "question_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_question_logs" ADD CONSTRAINT "interview_question_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_question_logs" ADD CONSTRAINT "interview_question_logs_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "interviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_question_logs" ADD CONSTRAINT "interview_question_logs_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "guide_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_question_logs" ADD CONSTRAINT "interview_question_logs_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

