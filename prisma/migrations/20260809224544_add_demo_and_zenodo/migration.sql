-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Preprint" (
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
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "doi" TEXT,
    "zenodoRecordId" TEXT,
    "zenodoUrl" TEXT,
    "zenodoConceptDoi" TEXT,
    "submittedById" TEXT NOT NULL,
    "moderatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "publishedAt" DATETIME,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Preprint_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Preprint_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Preprint" ("abstract", "authors", "comments", "createdAt", "downloads", "fileMime", "fileOriginalName", "fileSize", "fileStoredName", "id", "keywords", "license", "moderatedById", "moderationNote", "publishedAt", "slug", "status", "subject", "submittedById", "title", "updatedAt", "version") SELECT "abstract", "authors", "comments", "createdAt", "downloads", "fileMime", "fileOriginalName", "fileSize", "fileStoredName", "id", "keywords", "license", "moderatedById", "moderationNote", "publishedAt", "slug", "status", "subject", "submittedById", "title", "updatedAt", "version" FROM "Preprint";
DROP TABLE "Preprint";
ALTER TABLE "new_Preprint" RENAME TO "Preprint";
CREATE UNIQUE INDEX "Preprint_slug_key" ON "Preprint"("slug");
CREATE INDEX "Preprint_status_idx" ON "Preprint"("status");
CREATE INDEX "Preprint_subject_idx" ON "Preprint"("subject");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
