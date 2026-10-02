-- AlterTable
ALTER TABLE "question_sets" ADD COLUMN     "translation_reviewed_at" TIMESTAMP(3),
ADD COLUMN     "translation_reviewed_by_id" TEXT,
ADD COLUMN     "translation_status" TEXT;

-- AlterTable
ALTER TABLE "analysis_reports" ADD COLUMN     "interview_type" TEXT;
