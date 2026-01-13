import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';

// Import the Express app
let app;

// Try to import app, but don't fail the test setup if routes don't exist yet
try {
  const appModule = await import('../../src/index.js');
  app = appModule.default;
} catch (error) {
  // App/routes not fully implemented yet - tests should fail gracefully
  app = null;
}

describe('Bracket API Routes - Structure Endpoint', () => {
  describe('GET /api/v1/brackets/structure/:playerCount', () => {
    it('should return 200 with valid bracket structure for 7 players', async () => {
      if (!app) {
        throw new Error('App not configured with bracket routes yet');
      }

      const response = await request(app)
        .get('/api/v1/brackets/structure/7')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.playerCount).toBe(7);
      expect(response.body.data.structure).toBe('1000');
      expect(response.body.data.preliminaryMatches).toBe(3);
      expect(response.body.data.byes).toBe(1);
      expect(response.body.data.bracketSize).toBe(8);
    });

    it('should return 200 with valid bracket structure for 16 players', async () => {
      if (!app) {
        throw new Error('App not configured with bracket routes yet');
      }

      const response = await request(app)
        .get('/api/v1/brackets/structure/16')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.playerCount).toBe(16);
      expect(response.body.data.structure).toBe('0000 0000');
      expect(response.body.data.preliminaryMatches).toBe(8);
      expect(response.body.data.byes).toBe(0);
    });

    it('should return 200 with valid bracket structure for 11 players', async () => {
      if (!app) {
        throw new Error('App not configured with bracket routes yet');
      }

      const response = await request(app)
        .get('/api/v1/brackets/structure/11')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.playerCount).toBe(11);
      expect(response.body.data.structure).toBe('1110 0101');
    });

    it('should return 400 for player count < 4', async () => {
      if (!app) {
        throw new Error('App not configured with bracket routes yet');
      }

      const response = await request(app)
        .get('/api/v1/brackets/structure/3')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR'); // Middleware returns VALIDATION_ERROR
      expect(response.body.error.message).toContain('Invalid route parameters');
    });

    it('should return 400 for player count > 128', async () => {
      if (!app) {
        throw new Error('App not configured with bracket routes yet');
      }

      const response = await request(app)
        .get('/api/v1/brackets/structure/200')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR'); // Middleware returns VALIDATION_ERROR
      expect(response.body.error.message).toContain('Invalid route parameters');
    });

    it('should return 400 for non-integer player count', async () => {
      if (!app) {
        throw new Error('App not configured with bracket routes yet');
      }

      const response = await request(app)
        .get('/api/v1/brackets/structure/7.5')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR'); // Middleware returns VALIDATION_ERROR
    });

    it('should return 400 for non-numeric player count', async () => {
      if (!app) {
        throw new Error('App not configured with bracket routes yet');
      }

      const response = await request(app)
        .get('/api/v1/brackets/structure/abc')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should follow BATL API error format', async () => {
      if (!app) {
        throw new Error('App not configured with bracket routes yet');
      }

      const response = await request(app)
        .get('/api/v1/brackets/structure/2')
        .expect(400);

      // Verify error structure matches BATL API format
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('details');
    });

    it('should include interpretation field in successful response', async () => {
      if (!app) {
        throw new Error('App not configured with bracket routes yet');
      }

      const response = await request(app)
        .get('/api/v1/brackets/structure/10')
        .expect(200);

      expect(response.body.data).toHaveProperty('interpretation');
      expect(response.body.data.interpretation).toHaveProperty('0');
      expect(response.body.data.interpretation).toHaveProperty('1');
    });
  });

  describe('GET /api/v1/brackets/seeding/:playerCount', () => {
    it('should return 200 with 2 seeded players for 7 player tournament', async () => {
      if (!app) {
        throw new Error('App not configured with seeding routes yet');
      }

      const response = await request(app)
        .get('/api/v1/brackets/seeding/7')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.playerCount).toBe(7);
      expect(response.body.data.seededPlayers).toBe(2);
      expect(response.body.data.range.min).toBe(4);
      expect(response.body.data.range.max).toBe(9);
      expect(response.body.data.note).toContain('manually');
    });

    it('should return 200 with 4 seeded players for 15 player tournament', async () => {
      if (!app) {
        throw new Error('App not configured with seeding routes yet');
      }

      const response = await request(app)
        .get('/api/v1/brackets/seeding/15')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.playerCount).toBe(15);
      expect(response.body.data.seededPlayers).toBe(4);
      expect(response.body.data.range.min).toBe(10);
      expect(response.body.data.range.max).toBe(19);
    });

    it('should return 200 with 8 seeded players for 30 player tournament', async () => {
      if (!app) {
        throw new Error('App not configured with seeding routes yet');
      }

      const response = await request(app)
        .get('/api/v1/brackets/seeding/30')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.playerCount).toBe(30);
      expect(response.body.data.seededPlayers).toBe(8);
      expect(response.body.data.range.min).toBe(20);
      expect(response.body.data.range.max).toBe(39);
    });

    it('should return 200 with 16 seeded players for 100 player tournament', async () => {
      if (!app) {
        throw new Error('App not configured with seeding routes yet');
      }

      const response = await request(app)
        .get('/api/v1/brackets/seeding/100')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.playerCount).toBe(100);
      expect(response.body.data.seededPlayers).toBe(16);
      expect(response.body.data.range.min).toBe(40);
      expect(response.body.data.range.max).toBe(128);
    });

    it('should return 400 for player count < 4', async () => {
      if (!app) {
        throw new Error('App not configured with seeding routes yet');
      }

      const response = await request(app)
        .get('/api/v1/brackets/seeding/3')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for player count > 128', async () => {
      if (!app) {
        throw new Error('App not configured with seeding routes yet');
      }

      const response = await request(app)
        .get('/api/v1/brackets/seeding/200')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for non-numeric player count', async () => {
      if (!app) {
        throw new Error('App not configured with seeding routes yet');
      }

      const response = await request(app)
        .get('/api/v1/brackets/seeding/abc')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should test boundary values for all seeding ranges', async () => {
      if (!app) {
        throw new Error('App not configured with seeding routes yet');
      }

      // Test boundaries for each range
      const testCases = [
        { playerCount: 4, expectedSeeded: 2 },   // Min of range 1
        { playerCount: 9, expectedSeeded: 2 },   // Max of range 1
        { playerCount: 10, expectedSeeded: 4 },  // Min of range 2
        { playerCount: 19, expectedSeeded: 4 },  // Max of range 2
        { playerCount: 20, expectedSeeded: 8 },  // Min of range 3
        { playerCount: 39, expectedSeeded: 8 },  // Max of range 3
        { playerCount: 40, expectedSeeded: 16 }, // Min of range 4
        { playerCount: 128, expectedSeeded: 16 } // Max of range 4
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .get(`/api/v1/brackets/seeding/${testCase.playerCount}`)
          .expect(200);

        expect(response.body.data.seededPlayers).toBe(testCase.expectedSeeded);
      }
    });
  });
});
