-- AlterTable
ALTER TABLE "users" ADD COLUMN     "field_access_code" TEXT,
ADD COLUMN     "field_access_code_issued_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "users_field_access_code_key" ON "users"("field_access_code");

