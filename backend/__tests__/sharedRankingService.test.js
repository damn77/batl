// Tests for Shared Ranking Service

import * as sharedRankingService from '../src/services/sharedRankingService.js';

describe('Shared Ranking Service', () => {
    describe('calculateWinRate', () => {
        it('should return 0 when there are no matches', () => {
            const winRate = sharedRankingService.calculateWinRate(0, 0);
            expect(winRate).toBe(0);
        });

        it('should calculate correct win rate for wins only', () => {
            const winRate = sharedRankingService.calculateWinRate(5, 0);
            expect(winRate).toBe(1);
        });

        it('should calculate correct win rate for losses only', () => {
            const winRate = sharedRankingService.calculateWinRate(0, 5);
            expect(winRate).toBe(0);
        });

        it('should calculate correct win rate for mixed results', () => {
            const winRate = sharedRankingService.calculateWinRate(7, 3);
            expect(winRate).toBe(0.7);
        });

        it('should round to 3 decimal places', () => {
            const winRate = sharedRankingService.calculateWinRate(2, 3);
            expect(winRate).toBe(0.4);
        });
    });

    describe('formatRanking', () => {
        it('should format ranking with calculated win rate', () => {
            const ranking = {
                rank: 1,
                points: 100,
                wins: 8,
                losses: 2,
                updatedAt: new Date('2025-01-01')
            };

            const formatted = sharedRankingService.formatRanking(ranking);

            expect(formatted).toEqual({
                rank: 1,
                points: 100,
                wins: 8,
                losses: 2,
                winRate: 0.8,
                lastUpdated: ranking.updatedAt
            });
        });
    });

    describe('formatLeaderboard', () => {
        it('should format multiple rankings with pagination', () => {
            const rankings = [
                { rank: 1, points: 100, wins: 10, losses: 0, updatedAt: new Date('2025-01-01') },
                { rank: 2, points: 80, wins: 8, losses: 2, updatedAt: new Date('2025-01-02') }
            ];

            const pagination = { page: 1, limit: 10, total: 2 };

            const leaderboard = sharedRankingService.formatLeaderboard(rankings, pagination);

            expect(leaderboard.rankings).toHaveLength(2);
            expect(leaderboard.rankings[0].winRate).toBe(1);
            expect(leaderboard.rankings[1].winRate).toBe(0.8);
            expect(leaderboard.pagination).toEqual(pagination);
        });
    });
});
