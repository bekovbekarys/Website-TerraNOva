-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "affiliation" TEXT,
    "orcid" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Preprint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "abstract" TEXT NOT NULL,
    "authors" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "keywords" TEXT,
    "license" TEXT NOT NULL DEFAULT 'CC BY 4.0',
    "comments" TEXT,
    "fileOriginalName" TEXT NOT NULL,
    "fileStoredName" TEXT NOT NULL,
    "fileMime" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "moderationNote" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "submittedById" TEXT NOT NULL,
    "moderatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "publishedAt" DATETIME,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Preprint_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Preprint_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Preprint_slug_key" ON "Preprint"("slug");

-- CreateIndex
CREATE INDEX "Preprint_status_idx" ON "Preprint"("status");

-- CreateIndex
CREATE INDEX "Preprint_subject_idx" ON "Preprint"("subject");
