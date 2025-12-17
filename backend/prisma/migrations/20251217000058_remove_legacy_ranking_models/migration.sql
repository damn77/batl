/*
  Warnings:

  - You are about to drop the `CategoryRanking` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PairRanking` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."CategoryRanking" DROP CONSTRAINT "CategoryRanking_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."CategoryRanking" DROP CONSTRAINT "CategoryRanking_playerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PairRanking" DROP CONSTRAINT "PairRanking_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PairRanking" DROP CONSTRAINT "PairRanking_pairId_fkey";

-- DropTable
DROP TABLE "public"."CategoryRanking";

-- DropTable
DROP TABLE "public"."PairRanking";
