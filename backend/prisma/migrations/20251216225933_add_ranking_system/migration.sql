-- CreateEnum
CREATE TYPE "RankingType" AS ENUM ('SINGLES', 'PAIR', 'MEN', 'WOMEN');

-- CreateEnum
CREATE TYPE "RankingEntityType" AS ENUM ('PLAYER', 'PAIR');

-- CreateEnum
CREATE TYPE "CalculationMethod" AS ENUM ('PLACEMENT', 'FINAL_ROUND');

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "countedTournamentsLimit" INTEGER NOT NULL DEFAULT 7;

-- CreateTable
CREATE TABLE "Ranking" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "type" "RankingType" NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ranking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankingEntry" (
    "id" TEXT NOT NULL,
    "rankingId" TEXT NOT NULL,
    "entityType" "RankingEntityType" NOT NULL,
    "playerId" TEXT,
    "pairId" TEXT,
    "rank" INTEGER NOT NULL,
    "totalPoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tournamentCount" INTEGER NOT NULL DEFAULT 0,
    "lastTournamentDate" TIMESTAMP(3),
    "seedingScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RankingEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentResult" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "rankingEntryId" TEXT NOT NULL,
    "entityType" "RankingEntityType" NOT NULL,
    "playerId" TEXT,
    "pairId" TEXT,
    "placement" INTEGER,
    "finalRoundReached" TEXT,
    "pointsAwarded" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "awardDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointTable" (
    "id" TEXT NOT NULL,
    "participantRange" TEXT NOT NULL,
    "roundName" TEXT NOT NULL,
    "points" DOUBLE PRECISION NOT NULL,
    "isConsolation" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PointTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentPointConfig" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "calculationMethod" "CalculationMethod" NOT NULL DEFAULT 'PLACEMENT',
    "multiplicativeValue" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "doublePointsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentPointConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ranking_categoryId_year_isArchived_idx" ON "Ranking"("categoryId", "year", "isArchived");

-- CreateIndex
CREATE INDEX "Ranking_year_isArchived_idx" ON "Ranking"("year", "isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "Ranking_categoryId_year_type_key" ON "Ranking"("categoryId", "year", "type");

-- CreateIndex
CREATE INDEX "RankingEntry_rankingId_rank_idx" ON "RankingEntry"("rankingId", "rank");

-- CreateIndex
CREATE INDEX "RankingEntry_playerId_idx" ON "RankingEntry"("playerId");

-- CreateIndex
CREATE INDEX "RankingEntry_pairId_idx" ON "RankingEntry"("pairId");

-- CreateIndex
CREATE INDEX "RankingEntry_rankingId_totalPoints_idx" ON "RankingEntry"("rankingId", "totalPoints");

-- CreateIndex
CREATE UNIQUE INDEX "RankingEntry_rankingId_playerId_key" ON "RankingEntry"("rankingId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "RankingEntry_rankingId_pairId_key" ON "RankingEntry"("rankingId", "pairId");

-- CreateIndex
CREATE INDEX "TournamentResult_tournamentId_idx" ON "TournamentResult"("tournamentId");

-- CreateIndex
CREATE INDEX "TournamentResult_rankingEntryId_idx" ON "TournamentResult"("rankingEntryId");

-- CreateIndex
CREATE INDEX "TournamentResult_playerId_idx" ON "TournamentResult"("playerId");

-- CreateIndex
CREATE INDEX "TournamentResult_pairId_idx" ON "TournamentResult"("pairId");

-- CreateIndex
CREATE INDEX "TournamentResult_awardDate_idx" ON "TournamentResult"("awardDate");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentResult_tournamentId_rankingEntryId_key" ON "TournamentResult"("tournamentId", "rankingEntryId");

-- CreateIndex
CREATE INDEX "PointTable_participantRange_idx" ON "PointTable"("participantRange");

-- CreateIndex
CREATE UNIQUE INDEX "PointTable_participantRange_roundName_isConsolation_key" ON "PointTable"("participantRange", "roundName", "isConsolation");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentPointConfig_tournamentId_key" ON "TournamentPointConfig"("tournamentId");

-- CreateIndex
CREATE INDEX "TournamentPointConfig_tournamentId_idx" ON "TournamentPointConfig"("tournamentId");

-- AddForeignKey
ALTER TABLE "Ranking" ADD CONSTRAINT "Ranking_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankingEntry" ADD CONSTRAINT "RankingEntry_rankingId_fkey" FOREIGN KEY ("rankingId") REFERENCES "Ranking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankingEntry" ADD CONSTRAINT "RankingEntry_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankingEntry" ADD CONSTRAINT "RankingEntry_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "DoublesPair"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentResult" ADD CONSTRAINT "TournamentResult_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentResult" ADD CONSTRAINT "TournamentResult_rankingEntryId_fkey" FOREIGN KEY ("rankingEntryId") REFERENCES "RankingEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentResult" ADD CONSTRAINT "TournamentResult_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentResult" ADD CONSTRAINT "TournamentResult_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "DoublesPair"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentPointConfig" ADD CONSTRAINT "TournamentPointConfig_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
