/*
  Warnings:

  - Added the required column `defaultScoringRules` to the `Tournament` table without a default value. This is not possible if the table is not empty.
  - Added the required column `formatConfig` to the `Tournament` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "groupNumber" INTEGER NOT NULL,
    "groupSize" INTEGER NOT NULL,
    "ruleOverrides" TEXT,
    "advancementCriteria" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Group_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bracket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "bracketType" TEXT NOT NULL,
    "matchGuarantee" TEXT NOT NULL,
    "ruleOverrides" TEXT,
    "placementRange" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bracket_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "bracketId" TEXT,
    "roundNumber" INTEGER NOT NULL,
    "ruleOverrides" TEXT,
    "earlyTiebreakEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Round_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Round_bracketId_fkey" FOREIGN KEY ("bracketId") REFERENCES "Bracket" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "groupId" TEXT,
    "bracketId" TEXT,
    "roundId" TEXT,
    "matchNumber" INTEGER NOT NULL,
    "player1Id" TEXT NOT NULL,
    "player2Id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "result" TEXT,
    "ruleOverrides" TEXT,
    "completedWithRules" TEXT,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Match_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Match_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Match_bracketId_fkey" FOREIGN KEY ("bracketId") REFERENCES "Bracket" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Match_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Match_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "PlayerProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "PlayerProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GroupParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "seedPosition" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GroupParticipant_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GroupParticipant_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "PlayerProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Tournament" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "description" TEXT,
    "locationId" TEXT,
    "backupLocationId" TEXT,
    "courts" INTEGER,
    "capacity" INTEGER,
    "organizerId" TEXT,
    "deputyOrganizerId" TEXT,
    "entryFee" REAL,
    "rulesUrl" TEXT,
    "prizeDescription" TEXT,
    "registrationOpenDate" DATETIME,
    "registrationCloseDate" DATETIME,
    "minParticipants" INTEGER,
    "waitlistDisplayOrder" TEXT NOT NULL DEFAULT 'REGISTRATION_TIME',
    "formatType" TEXT NOT NULL DEFAULT 'KNOCKOUT',
    "formatConfig" TEXT NOT NULL,
    "defaultScoringRules" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "lastStatusChange" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tournament_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Tournament_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tournament_backupLocationId_fkey" FOREIGN KEY ("backupLocationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tournament_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tournament_deputyOrganizerId_fkey" FOREIGN KEY ("deputyOrganizerId") REFERENCES "Organizer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Tournament" ("backupLocationId", "capacity", "categoryId", "courts", "createdAt", "deputyOrganizerId", "description", "endDate", "entryFee", "id", "lastStatusChange", "locationId", "minParticipants", "name", "organizerId", "prizeDescription", "registrationCloseDate", "registrationOpenDate", "rulesUrl", "startDate", "status", "updatedAt", "waitlistDisplayOrder", "formatType", "formatConfig", "defaultScoringRules")
SELECT "backupLocationId", "capacity", "categoryId", "courts", "createdAt", "deputyOrganizerId", "description", "endDate", "entryFee", "id", "lastStatusChange", "locationId", "minParticipants", "name", "organizerId", "prizeDescription", "registrationCloseDate", "registrationOpenDate", "rulesUrl", "startDate", "status", "updatedAt", "waitlistDisplayOrder",
'KNOCKOUT',
'{"formatType":"KNOCKOUT","matchGuarantee":"MATCH_1"}',
'{"formatType":"SETS","winningSets":2,"advantageRule":"ADVANTAGE","tiebreakTrigger":"6-6"}'
FROM "Tournament";
DROP TABLE "Tournament";
ALTER TABLE "new_Tournament" RENAME TO "Tournament";
CREATE INDEX "Tournament_categoryId_idx" ON "Tournament"("categoryId");
CREATE INDEX "Tournament_startDate_idx" ON "Tournament"("startDate");
CREATE INDEX "Tournament_status_idx" ON "Tournament"("status");
CREATE INDEX "Tournament_registrationOpenDate_idx" ON "Tournament"("registrationOpenDate");
CREATE INDEX "Tournament_registrationCloseDate_idx" ON "Tournament"("registrationCloseDate");
CREATE INDEX "Tournament_locationId_idx" ON "Tournament"("locationId");
CREATE INDEX "Tournament_organizerId_idx" ON "Tournament"("organizerId");
CREATE INDEX "Tournament_formatType_idx" ON "Tournament"("formatType");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Group_tournamentId_idx" ON "Group"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "Group_tournamentId_groupNumber_key" ON "Group"("tournamentId", "groupNumber");

-- CreateIndex
CREATE INDEX "Bracket_tournamentId_idx" ON "Bracket"("tournamentId");

-- CreateIndex
CREATE INDEX "Bracket_bracketType_idx" ON "Bracket"("bracketType");

-- CreateIndex
CREATE INDEX "Round_tournamentId_idx" ON "Round"("tournamentId");

-- CreateIndex
CREATE INDEX "Round_bracketId_idx" ON "Round"("bracketId");

-- CreateIndex
CREATE UNIQUE INDEX "Round_tournamentId_bracketId_roundNumber_key" ON "Round"("tournamentId", "bracketId", "roundNumber");

-- CreateIndex
CREATE INDEX "Match_tournamentId_idx" ON "Match"("tournamentId");

-- CreateIndex
CREATE INDEX "Match_groupId_idx" ON "Match"("groupId");

-- CreateIndex
CREATE INDEX "Match_bracketId_idx" ON "Match"("bracketId");

-- CreateIndex
CREATE INDEX "Match_roundId_idx" ON "Match"("roundId");

-- CreateIndex
CREATE INDEX "Match_player1Id_idx" ON "Match"("player1Id");

-- CreateIndex
CREATE INDEX "Match_player2Id_idx" ON "Match"("player2Id");

-- CreateIndex
CREATE INDEX "Match_status_idx" ON "Match"("status");

-- CreateIndex
CREATE INDEX "GroupParticipant_groupId_idx" ON "GroupParticipant"("groupId");

-- CreateIndex
CREATE INDEX "GroupParticipant_playerId_idx" ON "GroupParticipant"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupParticipant_groupId_playerId_key" ON "GroupParticipant"("groupId", "playerId");
