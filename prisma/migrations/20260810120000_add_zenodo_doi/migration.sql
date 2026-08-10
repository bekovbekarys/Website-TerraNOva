-- AlterTable: Zenodo / DOI fields
ALTER TABLE "Preprint" ADD COLUMN "doi" TEXT;
ALTER TABLE "Preprint" ADD COLUMN "zenodoRecordId" TEXT;
ALTER TABLE "Preprint" ADD COLUMN "zenodoUrl" TEXT;
ALTER TABLE "Preprint" ADD COLUMN "zenodoConceptDoi" TEXT;
