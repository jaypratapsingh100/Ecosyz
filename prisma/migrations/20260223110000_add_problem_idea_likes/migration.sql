-- CreateTable
CREATE TABLE "ProblemIdeaPostLike" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProblemIdeaPostLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemIdeaCommentLike" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProblemIdeaCommentLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProblemIdeaPostLike_postId_userId_key" ON "ProblemIdeaPostLike"("postId", "userId");

-- CreateIndex
CREATE INDEX "ProblemIdeaPostLike_postId_idx" ON "ProblemIdeaPostLike"("postId");

-- CreateIndex
CREATE INDEX "ProblemIdeaPostLike_userId_idx" ON "ProblemIdeaPostLike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProblemIdeaCommentLike_commentId_userId_key" ON "ProblemIdeaCommentLike"("commentId", "userId");

-- CreateIndex
CREATE INDEX "ProblemIdeaCommentLike_commentId_idx" ON "ProblemIdeaCommentLike"("commentId");

-- CreateIndex
CREATE INDEX "ProblemIdeaCommentLike_userId_idx" ON "ProblemIdeaCommentLike"("userId");

-- AddForeignKey
ALTER TABLE "ProblemIdeaPostLike" ADD CONSTRAINT "ProblemIdeaPostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ProblemIdeaPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemIdeaPostLike" ADD CONSTRAINT "ProblemIdeaPostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemIdeaCommentLike" ADD CONSTRAINT "ProblemIdeaCommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "ProblemIdeaComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemIdeaCommentLike" ADD CONSTRAINT "ProblemIdeaCommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
