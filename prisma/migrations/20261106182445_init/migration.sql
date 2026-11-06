-- CreateEnum
CREATE TYPE "Role" AS ENUM ('RETAILER', 'DESK');

-- CreateEnum
CREATE TYPE "Lang" AS ENUM ('en', 'hi');

-- CreateEnum
CREATE TYPE "SchemeType" AS ENUM ('FREE_GOODS', 'SLAB_DISCOUNT');

-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('APP', 'CAPTURE');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('CONFIRMED', 'CREDIT_HOLD', 'EXPORTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CaptureStatus" AS ENUM ('NEEDS_REVIEW', 'CONFIRMED', 'DISCARDED');

-- CreateEnum
CREATE TYPE "CaptureChannel" AS ENUM ('WHATSAPP_TEXT', 'APP_TEXT');

-- CreateEnum
CREATE TYPE "CaptureUnit" AS ENUM ('CASE', 'PIECE', 'UNKNOWN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "lang" "Lang" NOT NULL DEFAULT 'en',
    "retailerId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpChallenge" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Retailer" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "shopName" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "creditLimitPaise" INTEGER NOT NULL,
    "outstandingPaise" INTEGER NOT NULL,
    "outstandingAsOf" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Retailer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameHi" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "packLabel" TEXT NOT NULL,
    "unitsPerCase" INTEGER NOT NULL,
    "unitPricePaise" INTEGER NOT NULL,
    "gstRateBp" INTEGER NOT NULL,
    "stockCases" INTEGER NOT NULL,
    "image" TEXT NOT NULL,
    "keywords" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailerPrice" (
    "retailerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "unitPricePaise" INTEGER NOT NULL,

    CONSTRAINT "RetailerPrice_pkey" PRIMARY KEY ("retailerId","productId")
);

-- CreateTable
CREATE TABLE "Scheme" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "SchemeType" NOT NULL,
    "buyCases" INTEGER,
    "freeCases" INTEGER,
    "slabs" JSONB,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Scheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "retailerId" TEXT NOT NULL,
    "placedById" TEXT NOT NULL,
    "source" "OrderSource" NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "grossPaise" INTEGER NOT NULL,
    "discountPaise" INTEGER NOT NULL,
    "taxablePaise" INTEGER NOT NULL,
    "gstPaise" INTEGER NOT NULL,
    "totalPaise" INTEGER NOT NULL,
    "holdReason" TEXT,
    "rejectReason" TEXT,
    "exportBatchId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderLine" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "cases" INTEGER NOT NULL,
    "freeCases" INTEGER NOT NULL,
    "unitPricePaise" INTEGER NOT NULL,
    "casePricePaise" INTEGER NOT NULL,
    "grossPaise" INTEGER NOT NULL,
    "discountPaise" INTEGER NOT NULL,
    "taxablePaise" INTEGER NOT NULL,
    "gstRateBp" INTEGER NOT NULL,
    "gstPaise" INTEGER NOT NULL,
    "totalPaise" INTEGER NOT NULL,
    "schemeLabel" TEXT,

    CONSTRAINT "OrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Capture" (
    "id" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "channel" "CaptureChannel" NOT NULL,
    "rawText" TEXT NOT NULL,
    "parser" TEXT NOT NULL,
    "parserNote" TEXT,
    "status" "CaptureStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Capture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaptureLine" (
    "id" TEXT NOT NULL,
    "captureId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "rawText" TEXT NOT NULL,
    "phrase" TEXT NOT NULL,
    "qty" INTEGER,
    "unit" "CaptureUnit" NOT NULL,
    "productId" TEXT,
    "confidence" INTEGER NOT NULL,
    "matchedBy" TEXT NOT NULL,
    "alternatives" JSONB NOT NULL,

    CONSTRAINT "CaptureLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailerAlias" (
    "id" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "phrase" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetailerAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportBatch" (
    "id" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "OtpChallenge_phone_createdAt_idx" ON "OtpChallenge"("phone", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Retailer_code_key" ON "Retailer"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");

-- CreateIndex
CREATE INDEX "Scheme_productId_idx" ON "Scheme"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Order_retailerId_createdAt_idx" ON "Order"("retailerId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Capture_orderId_key" ON "Capture"("orderId");

-- CreateIndex
CREATE INDEX "Capture_status_createdAt_idx" ON "Capture"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RetailerAlias_retailerId_phrase_key" ON "RetailerAlias"("retailerId", "phrase");

-- CreateIndex
CREATE INDEX "AuditLog_entityId_idx" ON "AuditLog"("entityId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerPrice" ADD CONSTRAINT "RetailerPrice_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerPrice" ADD CONSTRAINT "RetailerPrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scheme" ADD CONSTRAINT "Scheme_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_placedById_fkey" FOREIGN KEY ("placedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_exportBatchId_fkey" FOREIGN KEY ("exportBatchId") REFERENCES "ExportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Capture" ADD CONSTRAINT "Capture_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Capture" ADD CONSTRAINT "Capture_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Capture" ADD CONSTRAINT "Capture_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaptureLine" ADD CONSTRAINT "CaptureLine_captureId_fkey" FOREIGN KEY ("captureId") REFERENCES "Capture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaptureLine" ADD CONSTRAINT "CaptureLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerAlias" ADD CONSTRAINT "RetailerAlias_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerAlias" ADD CONSTRAINT "RetailerAlias_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerAlias" ADD CONSTRAINT "RetailerAlias_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportBatch" ADD CONSTRAINT "ExportBatch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
