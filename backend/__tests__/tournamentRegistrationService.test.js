// Tests for Tournament Registration Service
// Feature: 003-tournament-registration

import * as sharedTournamentService from '../src/services/sharedTournamentService.js';

describe('Tournament Registration Service', () => {
    describe('checkCapacity', () => {
        it('should have checkCapacity function available from sharedTournamentService', () => {
            // Verify the shared service function is available
            expect(sharedTournamentService.checkCapacity).toBeDefined();
            expect(typeof sharedTournamentService.checkCapacity).toBe('function');
        });
    });

    describe('getNextWaitlistCandidate', () => {
        it('should have getNextWaitlistCandidate function available from sharedTournamentService', () => {
            // Verify the shared service function is available
            expect(sharedTournamentService.getNextWaitlistCandidate).toBeDefined();
            expect(typeof sharedTournamentService.getNextWaitlistCandidate).toBe('function');
        });
    });
});

describe('Shared Tournament Service Integration', () => {
    it('should use shared service for capacity checks', () => {
        // Verify that the shared service is imported and available
        expect(sharedTournamentService).toBeDefined();
        expect(sharedTournamentService.checkCapacity).toBeDefined();
        expect(sharedTournamentService.getNextWaitlistCandidate).toBeDefined();
    });
});
