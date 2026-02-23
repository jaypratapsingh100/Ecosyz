-- CreateTable
CREATE TABLE "ProblemIdeaPost" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "type" TEXT NOT NULL DEFAULT 'idea',
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProblemIdeaPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemIdeaComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProblemIdeaComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProblemIdeaPost_authorId_idx" ON "ProblemIdeaPost"("authorId");

-- CreateIndex
CREATE INDEX "ProblemIdeaPost_createdAt_idx" ON "ProblemIdeaPost"("createdAt");

-- CreateIndex
CREATE INDEX "ProblemIdeaPost_type_idx" ON "ProblemIdeaPost"("type");

-- CreateIndex
CREATE INDEX "ProblemIdeaComment_postId_idx" ON "ProblemIdeaComment"("postId");

-- CreateIndex
CREATE INDEX "ProblemIdeaComment_authorId_idx" ON "ProblemIdeaComment"("authorId");

-- AddForeignKey
ALTER TABLE "ProblemIdeaPost" ADD CONSTRAINT "ProblemIdeaPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemIdeaComment" ADD CONSTRAINT "ProblemIdeaComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ProblemIdeaPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemIdeaComment" ADD CONSTRAINT "ProblemIdeaComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
