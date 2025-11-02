-- AlterTable
ALTER TABLE "PlayerProfile" ADD COLUMN "birthDate" DATETIME;
ALTER TABLE "PlayerProfile" ADD COLUMN "gender" TEXT;

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "ageGroup" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tournament_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CategoryRegistration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "registeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CategoryRegistration_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "PlayerProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CategoryRegistration_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CategoryRanking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "points" REAL NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CategoryRanking_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "PlayerProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CategoryRanking_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Category_type_idx" ON "Category"("type");

-- CreateIndex
CREATE INDEX "Category_ageGroup_idx" ON "Category"("ageGroup");

-- CreateIndex
CREATE INDEX "Category_gender_idx" ON "Category"("gender");

-- CreateIndex
CREATE UNIQUE INDEX "Category_type_ageGroup_gender_key" ON "Category"("type", "ageGroup", "gender");

-- CreateIndex
CREATE INDEX "Tournament_categoryId_idx" ON "Tournament"("categoryId");

-- CreateIndex
CREATE INDEX "Tournament_startDate_idx" ON "Tournament"("startDate");

-- CreateIndex
CREATE INDEX "Tournament_status_idx" ON "Tournament"("status");

-- CreateIndex
CREATE INDEX "CategoryRegistration_playerId_idx" ON "CategoryRegistration"("playerId");

-- CreateIndex
CREATE INDEX "CategoryRegistration_categoryId_idx" ON "CategoryRegistration"("categoryId");

-- CreateIndex
CREATE INDEX "CategoryRegistration_status_idx" ON "CategoryRegistration"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryRegistration_playerId_categoryId_key" ON "CategoryRegistration"("playerId", "categoryId");

-- CreateIndex
CREATE INDEX "CategoryRanking_categoryId_rank_idx" ON "CategoryRanking"("categoryId", "rank");

-- CreateIndex
CREATE INDEX "CategoryRanking_playerId_idx" ON "CategoryRanking"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryRanking_playerId_categoryId_key" ON "CategoryRanking"("playerId", "categoryId");

-- CreateIndex
CREATE INDEX "PlayerProfile_birthDate_idx" ON "PlayerProfile"("birthDate");

-- CreateIndex
CREATE INDEX "PlayerProfile_gender_idx" ON "PlayerProfile"("gender");
