-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "groupId" TEXT,
    "bracketId" TEXT,
    "roundId" TEXT,
    "matchNumber" INTEGER NOT NULL,
    "player1Id" TEXT NOT NULL,
    "player2Id" TEXT NOT NULL,
    "pair1Id" TEXT,
    "pair2Id" TEXT,
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
    CONSTRAINT "Match_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "PlayerProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_pair1Id_fkey" FOREIGN KEY ("pair1Id") REFERENCES "DoublesPair" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_pair2Id_fkey" FOREIGN KEY ("pair2Id") REFERENCES "DoublesPair" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Match" ("bracketId", "completedAt", "completedWithRules", "createdAt", "groupId", "id", "matchNumber", "player1Id", "player2Id", "result", "roundId", "ruleOverrides", "status", "tournamentId", "updatedAt") SELECT "bracketId", "completedAt", "completedWithRules", "createdAt", "groupId", "id", "matchNumber", "player1Id", "player2Id", "result", "roundId", "ruleOverrides", "status", "tournamentId", "updatedAt" FROM "Match";
DROP TABLE "Match";
ALTER TABLE "new_Match" RENAME TO "Match";
CREATE INDEX "Match_tournamentId_idx" ON "Match"("tournamentId");
CREATE INDEX "Match_groupId_idx" ON "Match"("groupId");
CREATE INDEX "Match_bracketId_idx" ON "Match"("bracketId");
CREATE INDEX "Match_roundId_idx" ON "Match"("roundId");
CREATE INDEX "Match_player1Id_idx" ON "Match"("player1Id");
CREATE INDEX "Match_player2Id_idx" ON "Match"("player2Id");
CREATE INDEX "Match_pair1Id_idx" ON "Match"("pair1Id");
CREATE INDEX "Match_pair2Id_idx" ON "Match"("pair2Id");
CREATE INDEX "Match_status_idx" ON "Match"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
