-- CreateTable
CREATE TABLE "DoublesPair" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "player1Id" TEXT NOT NULL,
    "player2Id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "seedingScore" REAL NOT NULL DEFAULT 0,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DoublesPair_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "PlayerProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DoublesPair_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "PlayerProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DoublesPair_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PairRanking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pairId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "points" REAL NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PairRanking_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "DoublesPair" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PairRanking_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PairRegistration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "pairId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "registrationTimestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eligibilityOverride" BOOLEAN NOT NULL DEFAULT false,
    "overrideReason" TEXT,
    "promotedAt" DATETIME,
    "demotedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PairRegistration_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PairRegistration_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "DoublesPair" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DoublesPair_player1Id_deletedAt_idx" ON "DoublesPair"("player1Id", "deletedAt");

-- CreateIndex
CREATE INDEX "DoublesPair_player2Id_deletedAt_idx" ON "DoublesPair"("player2Id", "deletedAt");

-- CreateIndex
CREATE INDEX "DoublesPair_categoryId_deletedAt_idx" ON "DoublesPair"("categoryId", "deletedAt");

-- CreateIndex
CREATE INDEX "DoublesPair_categoryId_seedingScore_deletedAt_idx" ON "DoublesPair"("categoryId", "seedingScore", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DoublesPair_player1Id_player2Id_categoryId_key" ON "DoublesPair"("player1Id", "player2Id", "categoryId");

-- CreateIndex
CREATE INDEX "PairRanking_categoryId_rank_idx" ON "PairRanking"("categoryId", "rank");

-- CreateIndex
CREATE INDEX "PairRanking_pairId_idx" ON "PairRanking"("pairId");

-- CreateIndex
CREATE UNIQUE INDEX "PairRanking_pairId_categoryId_key" ON "PairRanking"("pairId", "categoryId");

-- CreateIndex
CREATE INDEX "PairRegistration_tournamentId_status_idx" ON "PairRegistration"("tournamentId", "status");

-- CreateIndex
CREATE INDEX "PairRegistration_tournamentId_registrationTimestamp_idx" ON "PairRegistration"("tournamentId", "registrationTimestamp");

-- CreateIndex
CREATE INDEX "PairRegistration_pairId_status_idx" ON "PairRegistration"("pairId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PairRegistration_tournamentId_pairId_key" ON "PairRegistration"("tournamentId", "pairId");
