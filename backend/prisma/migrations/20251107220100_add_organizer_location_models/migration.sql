/*
  Warnings:

  - You are about to drop the column `location` on the `Tournament` table. All the data in the column will be lost.
  - You are about to drop the column `organizerEmail` on the `Tournament` table. All the data in the column will be lost.
  - You are about to drop the column `organizerPhone` on the `Tournament` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Organizer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Organizer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubName" TEXT NOT NULL,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
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
INSERT INTO "new_Tournament" ("capacity", "categoryId", "createdAt", "description", "endDate", "entryFee", "id", "lastStatusChange", "minParticipants", "name", "prizeDescription", "registrationCloseDate", "registrationOpenDate", "rulesUrl", "startDate", "status", "updatedAt", "waitlistDisplayOrder") SELECT "capacity", "categoryId", "createdAt", "description", "endDate", "entryFee", "id", "lastStatusChange", "minParticipants", "name", "prizeDescription", "registrationCloseDate", "registrationOpenDate", "rulesUrl", "startDate", "status", "updatedAt", "waitlistDisplayOrder" FROM "Tournament";
DROP TABLE "Tournament";
ALTER TABLE "new_Tournament" RENAME TO "Tournament";
CREATE INDEX "Tournament_categoryId_idx" ON "Tournament"("categoryId");
CREATE INDEX "Tournament_startDate_idx" ON "Tournament"("startDate");
CREATE INDEX "Tournament_status_idx" ON "Tournament"("status");
CREATE INDEX "Tournament_registrationOpenDate_idx" ON "Tournament"("registrationOpenDate");
CREATE INDEX "Tournament_registrationCloseDate_idx" ON "Tournament"("registrationCloseDate");
CREATE INDEX "Tournament_locationId_idx" ON "Tournament"("locationId");
CREATE INDEX "Tournament_organizerId_idx" ON "Tournament"("organizerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Organizer_userId_key" ON "Organizer"("userId");

-- CreateIndex
CREATE INDEX "Organizer_userId_idx" ON "Organizer"("userId");

-- CreateIndex
CREATE INDEX "Location_clubName_idx" ON "Location"("clubName");
