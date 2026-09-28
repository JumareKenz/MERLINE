-- AlterTable
ALTER TABLE "interview_question_logs" ADD COLUMN     "answer" JSONB;

-- AlterTable
ALTER TABLE "interviews" ADD COLUMN     "respondent_link_id" TEXT;

-- CreateTable
CREATE TABLE "respondent_links" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "intro" TEXT,
    "consent_text" TEXT NOT NULL,
    "interview_type" TEXT NOT NULL DEFAULT 'KII',
    "language" TEXT NOT NULL DEFAULT 'en',
    "respondent_name" TEXT,
    "max_responses" INTEGER,
    "expires_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "project_id" TEXT NOT NULL,
    "question_set_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "respondent_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "respondent_sessions" (
    "id" TEXT NOT NULL,
    "secret_hash" TEXT NOT NULL,
    "link_id" TEXT NOT NULL,
    "interview_id" TEXT NOT NULL,
    "upload_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "user_agent" TEXT,
    "finished_at" TIMESTAMP(3),
    "organization_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "respondent_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "respondent_links_token_key" ON "respondent_links"("token");

-- CreateIndex
CREATE INDEX "respondent_links_organization_id_idx" ON "respondent_links"("organization_id");

-- CreateIndex
CREATE INDEX "respondent_links_project_id_idx" ON "respondent_links"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "respondent_sessions_interview_id_key" ON "respondent_sessions"("interview_id");

-- CreateIndex
CREATE INDEX "respondent_sessions_link_id_idx" ON "respondent_sessions"("link_id");

-- CreateIndex
CREATE INDEX "respondent_sessions_organization_id_idx" ON "respondent_sessions"("organization_id");

-- CreateIndex
CREATE INDEX "interviews_respondent_link_id_idx" ON "interviews"("respondent_link_id");

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_respondent_link_id_fkey" FOREIGN KEY ("respondent_link_id") REFERENCES "respondent_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respondent_links" ADD CONSTRAINT "respondent_links_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respondent_links" ADD CONSTRAINT "respondent_links_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respondent_links" ADD CONSTRAINT "respondent_links_question_set_id_fkey" FOREIGN KEY ("question_set_id") REFERENCES "question_sets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respondent_links" ADD CONSTRAINT "respondent_links_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respondent_sessions" ADD CONSTRAINT "respondent_sessions_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "respondent_links"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respondent_sessions" ADD CONSTRAINT "respondent_sessions_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "interviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

