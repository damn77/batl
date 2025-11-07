-- CreateTable
CREATE TABLE "TournamentRegistration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "registrationTimestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" DATETIME,
    "cancelledAt" DATETIME,
    "promotedBy" TEXT,
    "promotedAt" DATETIME,
    "demotedBy" TEXT,
    "demotedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TournamentRegistration_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "PlayerProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TournamentRegistration_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CategoryRegistration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "hasParticipated" BOOLEAN NOT NULL DEFAULT false,
    "registeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CategoryRegistration_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "PlayerProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CategoryRegistration_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_CategoryRegistration" ("categoryId", "createdAt", "id", "notes", "playerId", "registeredAt", "status", "updatedAt", "withdrawnAt") SELECT "categoryId", "createdAt", "id", "notes", "playerId", "registeredAt", "status", "updatedAt", "withdrawnAt" FROM "CategoryRegistration";
DROP TABLE "CategoryRegistration";
ALTER TABLE "new_CategoryRegistration" RENAME TO "CategoryRegistration";
CREATE INDEX "CategoryRegistration_playerId_idx" ON "CategoryRegistration"("playerId");
CREATE INDEX "CategoryRegistration_categoryId_idx" ON "CategoryRegistration"("categoryId");
CREATE INDEX "CategoryRegistration_status_idx" ON "CategoryRegistration"("status");
CREATE INDEX "CategoryRegistration_hasParticipated_idx" ON "CategoryRegistration"("hasParticipated");
CREATE UNIQUE INDEX "CategoryRegistration_playerId_categoryId_key" ON "CategoryRegistration"("playerId", "categoryId");
CREATE TABLE "new_Tournament" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "capacity" INTEGER,
    "organizerEmail" TEXT,
    "organizerPhone" TEXT,
    "entryFee" REAL,
    "rulesUrl" TEXT,
    "prizeDescription" TEXT,
    "registrationOpenDate" DATETIME,
    "registrationCloseDate" DATETIME,
    "minParticipants" INTEGER,
    "waitlistDisplayOrder" TEXT NOT NULL DEFAULT 'REGISTRATION_TIME',
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "lastStatusChange" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tournament_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Tournament" ("categoryId", "createdAt", "description", "endDate", "id", "location", "name", "startDate", "status", "updatedAt") SELECT "categoryId", "createdAt", "description", "endDate", "id", "location", "name", "startDate", "status", "updatedAt" FROM "Tournament";
DROP TABLE "Tournament";
ALTER TABLE "new_Tournament" RENAME TO "Tournament";
CREATE INDEX "Tournament_categoryId_idx" ON "Tournament"("categoryId");
CREATE INDEX "Tournament_startDate_idx" ON "Tournament"("startDate");
CREATE INDEX "Tournament_status_idx" ON "Tournament"("status");
CREATE INDEX "Tournament_registrationOpenDate_idx" ON "Tournament"("registrationOpenDate");
CREATE INDEX "Tournament_registrationCloseDate_idx" ON "Tournament"("registrationCloseDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "TournamentRegistration_playerId_idx" ON "TournamentRegistration"("playerId");

-- CreateIndex
CREATE INDEX "TournamentRegistration_tournamentId_idx" ON "TournamentRegistration"("tournamentId");

-- CreateIndex
CREATE INDEX "TournamentRegistration_status_idx" ON "TournamentRegistration"("status");

-- CreateIndex
CREATE INDEX "TournamentRegistration_tournamentId_status_registrationTimestamp_idx" ON "TournamentRegistration"("tournamentId", "status", "registrationTimestamp");

-- CreateIndex
CREATE INDEX "TournamentRegistration_registrationTimestamp_idx" ON "TournamentRegistration"("registrationTimestamp");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentRegistration_playerId_tournamentId_key" ON "TournamentRegistration"("playerId", "tournamentId");
