-- CreateEnum
CREATE TYPE "AuctionStatus" AS ENUM ('ACTIVO', 'CERRADO_VENDIDO', 'CERRADO_SIN_RESERVA', 'CERRADO_SIN_PUJAS', 'CANCELADO');

-- CreateEnum
CREATE TYPE "AuctionShipping" AS ENUM ('COMPRADOR', 'VENDEDOR', 'A_CONVENIR');

-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT IF EXISTS "Conversation_listingId_fkey";

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "auctionId" TEXT,
ALTER COLUMN "listingId" DROP NOT NULL;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Auction" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "leaderId" TEXT,
    "title" VARCHAR(80) NOT NULL,
    "description" VARCHAR(4000) NOT NULL,
    "condition" "Condition" NOT NULL,
    "categoryId" TEXT NOT NULL,
    "baseCents" INTEGER NOT NULL,
    "reserveCents" INTEGER,
    "currentCents" INTEGER NOT NULL,
    "bidCount" INTEGER NOT NULL DEFAULT 0,
    "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endAt" TIMESTAMP(3) NOT NULL,
    "extensionCount" INTEGER NOT NULL DEFAULT 0,
    "status" "AuctionStatus" NOT NULL DEFAULT 'ACTIVO',
    "shipping" "AuctionShipping" NOT NULL DEFAULT 'A_CONVENIR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Auction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AuctionImage" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuctionImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Bid" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "bidderId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "autoMaxCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Auction_status_endAt_idx" ON "Auction"("status", "endAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Auction_categoryId_status_idx" ON "Auction"("categoryId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Bid_auctionId_createdAt_idx" ON "Bid"("auctionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Conversation_auctionId_buyerId_key" ON "Conversation"("auctionId", "buyerId");

-- AddForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT IF EXISTS "Conversation_listingId_fkey";
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT IF EXISTS "Conversation_auctionId_fkey";
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auction" DROP CONSTRAINT IF EXISTS "Auction_sellerId_fkey";
ALTER TABLE "Auction" ADD CONSTRAINT "Auction_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auction" DROP CONSTRAINT IF EXISTS "Auction_leaderId_fkey";
ALTER TABLE "Auction" ADD CONSTRAINT "Auction_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auction" DROP CONSTRAINT IF EXISTS "Auction_categoryId_fkey";
ALTER TABLE "Auction" ADD CONSTRAINT "Auction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionImage" DROP CONSTRAINT IF EXISTS "AuctionImage_auctionId_fkey";
ALTER TABLE "AuctionImage" ADD CONSTRAINT "AuctionImage_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" DROP CONSTRAINT IF EXISTS "Bid_auctionId_fkey";
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" DROP CONSTRAINT IF EXISTS "Bid_bidderId_fkey";
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_bidderId_fkey" FOREIGN KEY ("bidderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
