-- CreateEnum
CREATE TYPE "CaptureSource" AS ENUM ('TEXT', 'PHOTO', 'VOICE');

-- AlterTable
ALTER TABLE "Capture" ADD COLUMN     "source" "CaptureSource" NOT NULL DEFAULT 'TEXT';

-- CreateTable
CREATE TABLE "CaptureMedia" (
    "captureId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "bytes" BYTEA NOT NULL,

    CONSTRAINT "CaptureMedia_pkey" PRIMARY KEY ("captureId")
);

-- AddForeignKey
ALTER TABLE "CaptureMedia" ADD CONSTRAINT "CaptureMedia_captureId_fkey" FOREIGN KEY ("captureId") REFERENCES "Capture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
