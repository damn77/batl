-- CreateIndex
CREATE INDEX "RankingEntry_rankingId_totalPoints_lastTournamentDate_tourn_idx" ON "RankingEntry"("rankingId", "totalPoints", "lastTournamentDate", "tournamentCount");
