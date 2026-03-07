-- CreateTable
CREATE TABLE "InternSubTrack" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InternSubTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternMilestone" (
    "id" TEXT NOT NULL,
    "subTrackId" TEXT,
    "trackId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "stipend" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternMilestone_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "InternTask" ADD COLUMN "milestoneId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "InternSubTrack_trackId_slug_key" ON "InternSubTrack"("trackId", "slug");
CREATE INDEX "InternSubTrack_trackId_idx" ON "InternSubTrack"("trackId");
CREATE INDEX "InternMilestone_trackId_idx" ON "InternMilestone"("trackId");
CREATE INDEX "InternMilestone_subTrackId_idx" ON "InternMilestone"("subTrackId");
CREATE INDEX "InternTask_milestoneId_idx" ON "InternTask"("milestoneId");

-- AddForeignKey
ALTER TABLE "InternSubTrack" ADD CONSTRAINT "InternSubTrack_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "InternTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InternMilestone" ADD CONSTRAINT "InternMilestone_subTrackId_fkey" FOREIGN KEY ("subTrackId") REFERENCES "InternSubTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InternMilestone" ADD CONSTRAINT "InternMilestone_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "InternTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InternTask" ADD CONSTRAINT "InternTask_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "InternMilestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
