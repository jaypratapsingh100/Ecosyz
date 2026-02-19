-- AlterTable
ALTER TABLE "AppProject" ADD COLUMN IF NOT EXISTS "previewVersion" TEXT NOT NULL DEFAULT 'v1';
