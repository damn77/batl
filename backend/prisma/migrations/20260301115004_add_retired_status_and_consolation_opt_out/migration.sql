-- AlterEnum
ALTER TYPE "MatchStatus" ADD VALUE 'RETIRED';

-- CreateTable
CREATE TABLE "ConsolationOptOut" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "playerId" TEXT,
    "pairId" TEXT,
    "recordedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsolationOptOut_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsolationOptOut_tournamentId_idx" ON "ConsolationOptOut"("tournamentId");

-- CreateIndex
CREATE INDEX "ConsolationOptOut_playerId_idx" ON "ConsolationOptOut"("playerId");

-- CreateIndex
CREATE INDEX "ConsolationOptOut_pairId_idx" ON "ConsolationOptOut"("pairId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsolationOptOut_tournamentId_playerId_key" ON "ConsolationOptOut"("tournamentId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsolationOptOut_tournamentId_pairId_key" ON "ConsolationOptOut"("tournamentId", "pairId");

-- AddForeignKey
ALTER TABLE "ConsolationOptOut" ADD CONSTRAINT "ConsolationOptOut_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsolationOptOut" ADD CONSTRAINT "ConsolationOptOut_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsolationOptOut" ADD CONSTRAINT "ConsolationOptOut_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "DoublesPair"("id") ON DELETE CASCADE ON UPDATE CASCADE;
