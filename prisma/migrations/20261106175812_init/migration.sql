-- CreateEnum
CREATE TYPE "Role" AS ENUM ('RETAILER', 'DESK', 'SALESMAN');

-- CreateEnum
CREATE TYPE "Lang" AS ENUM ('en', 'hi');

-- CreateEnum
CREATE TYPE "PriceTier" AS ENUM ('STANDARD', 'PREMIUM');

-- CreateEnum
CREATE TYPE "SchemeType" AS ENUM ('FREE_GOODS', 'SLAB_DISCOUNT');

-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('APP', 'CAPTURE', 'SALESMAN');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_REVIEW', 'CREDIT_HOLD', 'CONFIRMED', 'EXPORTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('WHATSAPP_MOCK', 'IN_APP');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('NEW', 'PARSED', 'CONVERTED', 'DISCARDED');

-- CreateEnum
CREATE TYPE "ParserKind" AS ENUM ('LLM', 'RULE');

-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('OPEN', 'CONFIRMED', 'DISCARDED');

-- CreateEnum
CREATE TYPE "CaptureUnit" AS ENUM ('CASE', 'PIECE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "Confidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "preferredLang" "Lang" NOT NULL DEFAULT 'en',
    "retailerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpChallenge" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Retailer" (
    "id" TEXT NOT NULL,
    "shopName" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "segment" TEXT,
    "priceTier" "PriceTier" NOT NULL DEFAULT 'STANDARD',
    "creditLimitPaise" INTEGER NOT NULL,
    "outstandingPaise" INTEGER NOT NULL DEFAULT 0,
    "tallyLedgerName" TEXT NOT NULL,
    "salesmanId" TEXT,

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
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameHi" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sku" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "packLabel" TEXT NOT NULL,
    "packGrams" INTEGER NOT NULL,
    "unitsPerCase" INTEGER NOT NULL,
    "unitPricePaise" INTEGER NOT NULL,
    "gstRateBps" INTEGER NOT NULL,
    "stockCases" INTEGER NOT NULL,
    "allowPieces" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Sku_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TierPrice" (
    "tier" "PriceTier" NOT NULL,
    "skuId" TEXT NOT NULL,
    "unitPricePaise" INTEGER NOT NULL,

    CONSTRAINT "TierPrice_pkey" PRIMARY KEY ("tier","skuId")
);

-- CreateTable
CREATE TABLE "RetailerPrice" (
    "retailerId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "unitPricePaise" INTEGER NOT NULL,

    CONSTRAINT "RetailerPrice_pkey" PRIMARY KEY ("retailerId","skuId")
);

-- CreateTable
CREATE TABLE "Scheme" (
    "id" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "type" "SchemeType" NOT NULL,
    "params" JSONB NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "segment" TEXT,
    "labelEn" TEXT NOT NULL,
    "labelHi" TEXT NOT NULL,

    CONSTRAINT "Scheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Counter" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "Counter_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "source" "OrderSource" NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "taxablePaise" INTEGER NOT NULL,
    "discountPaise" INTEGER NOT NULL,
    "gstPaise" INTEGER NOT NULL,
    "totalPaise" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "confirmedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "holdReleasedAt" TIMESTAMP(3),
    "repeatOfId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderLine" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "qtyCases" INTEGER NOT NULL,
    "freeCases" INTEGER NOT NULL DEFAULT 0,
    "unitPricePaise" INTEGER NOT NULL,
    "unitsPerCase" INTEGER NOT NULL,
    "discountPaise" INTEGER NOT NULL DEFAULT 0,
    "gstRateBps" INTEGER NOT NULL,
    "gstPaise" INTEGER NOT NULL,
    "lineTotalPaise" INTEGER NOT NULL,
    "schemeId" TEXT,
    "schemeSnapshot" JSONB,

    CONSTRAINT "OrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboundMessage" (
    "id" TEXT NOT NULL,
    "retailerId" TEXT,
    "fromPhone" TEXT NOT NULL,
    "channel" "Channel" NOT NULL,
    "rawText" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "MessageStatus" NOT NULL DEFAULT 'NEW',

    CONSTRAINT "InboundMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaptureDraft" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "parserUsed" "ParserKind" NOT NULL,
    "parserNote" TEXT,
    "status" "DraftStatus" NOT NULL DEFAULT 'OPEN',
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaptureDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaptureLine" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "originalText" TEXT NOT NULL,
    "normalisedPhrase" TEXT NOT NULL,
    "proposedSkuId" TEXT,
    "alternativeSkuIds" TEXT[],
    "qty" INTEGER,
    "unit" "CaptureUnit" NOT NULL,
    "confidence" "Confidence" NOT NULL,
    "confidenceSignals" JSONB NOT NULL,
    "issues" TEXT[],
    "resolvedSkuId" TEXT,
    "resolvedQty" INTEGER,
    "resolvedUnit" "CaptureUnit",
    "removed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CaptureLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailerAlias" (
    "id" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "phrase" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "createdFrom" TEXT NOT NULL DEFAULT 'DESK_CORRECTION',
    "hits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetailerAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TallyExport" (
    "id" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "orderIds" TEXT[],
    "format" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TallyExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "OtpChallenge_phone_createdAt_idx" ON "OtpChallenge"("phone", "createdAt");

-- CreateIndex
CREATE INDEX "OtpChallenge_ip_createdAt_idx" ON "OtpChallenge"("ip", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Retailer_phone_key" ON "Retailer"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Sku_code_key" ON "Sku"("code");

-- CreateIndex
CREATE INDEX "Scheme_skuId_idx" ON "Scheme"("skuId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");

-- CreateIndex
CREATE INDEX "Order_retailerId_createdAt_idx" ON "Order"("retailerId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "InboundMessage_retailerId_receivedAt_idx" ON "InboundMessage"("retailerId", "receivedAt");

-- CreateIndex
CREATE INDEX "CaptureLine_draftId_position_idx" ON "CaptureLine"("draftId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "RetailerAlias_retailerId_phrase_key" ON "RetailerAlias"("retailerId", "phrase");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retailer" ADD CONSTRAINT "Retailer_salesmanId_fkey" FOREIGN KEY ("salesmanId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sku" ADD CONSTRAINT "Sku_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TierPrice" ADD CONSTRAINT "TierPrice_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerPrice" ADD CONSTRAINT "RetailerPrice_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerPrice" ADD CONSTRAINT "RetailerPrice_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scheme" ADD CONSTRAINT "Scheme_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundMessage" ADD CONSTRAINT "InboundMessage_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaptureDraft" ADD CONSTRAINT "CaptureDraft_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "InboundMessage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaptureDraft" ADD CONSTRAINT "CaptureDraft_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaptureLine" ADD CONSTRAINT "CaptureLine_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "CaptureDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerAlias" ADD CONSTRAINT "RetailerAlias_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerAlias" ADD CONSTRAINT "RetailerAlias_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TallyExport" ADD CONSTRAINT "TallyExport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
