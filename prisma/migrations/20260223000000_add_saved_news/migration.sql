-- CreateTable
CREATE TABLE "SavedNews" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "source" TEXT,
    "category" TEXT,
    "imageUrl" TEXT,
    "includeInNewsletter" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedNews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SavedNews_userId_url_key" ON "SavedNews"("userId", "url");

-- CreateIndex
CREATE INDEX "SavedNews_userId_idx" ON "SavedNews"("userId");

-- CreateIndex
CREATE INDEX "SavedNews_includeInNewsletter_idx" ON "SavedNews"("includeInNewsletter");

-- AddForeignKey
ALTER TABLE "SavedNews" ADD CONSTRAINT "SavedNews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
