ALTER TABLE "InternFellow" ADD COLUMN IF NOT EXISTS "unlockedMilestoneIds" JSONB DEFAULT '[]';
