-- CreateTable
CREATE TABLE "InternTrack" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "stipendRange" TEXT,

    CONSTRAINT "InternTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternFellow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "resumeUrl" TEXT,
    "resumeParsed" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "xp" INTEGER NOT NULL DEFAULT 0,
    "milestonesCompleted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternFellow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternTask" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "fellowId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "stipend" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InternTrack_slug_key" ON "InternTrack"("slug");

-- CreateIndex
CREATE INDEX "InternTrack_slug_idx" ON "InternTrack"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "InternFellow_userId_key" ON "InternFellow"("userId");

-- CreateIndex
CREATE INDEX "InternFellow_userId_idx" ON "InternFellow"("userId");

-- CreateIndex
CREATE INDEX "InternFellow_trackId_idx" ON "InternFellow"("trackId");

-- CreateIndex
CREATE INDEX "InternFellow_status_idx" ON "InternFellow"("status");

-- CreateIndex
CREATE INDEX "InternTask_trackId_idx" ON "InternTask"("trackId");

-- CreateIndex
CREATE INDEX "InternTask_fellowId_idx" ON "InternTask"("fellowId");

-- CreateIndex
CREATE INDEX "InternTask_status_idx" ON "InternTask"("status");

-- AddForeignKey
ALTER TABLE "InternFellow" ADD CONSTRAINT "InternFellow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternFellow" ADD CONSTRAINT "InternFellow_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "InternTrack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternTask" ADD CONSTRAINT "InternTask_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "InternTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternTask" ADD CONSTRAINT "InternTask_fellowId_fkey" FOREIGN KEY ("fellowId") REFERENCES "InternFellow"("id") ON DELETE SET NULL ON UPDATE CASCADE;
