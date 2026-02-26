/**
 * Seed script for 11-player knockout tournament test data
 * Feature: 011-knockout-bracket-view
 *
 * Creates:
 * - 1 knockout tournament (active, Jan 1 - Dec 31, 2026)
 * - 11 players registered
 * - First round completed (3 preliminary matches + 5 byes)
 *
 * Run: npx prisma db seed -- --seed-file prisma/seed-knockout-test.js
 * Or:  node prisma/seed-knockout-test.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🏆 Creating 11-player knockout tournament test data...\n');

  // ============================================
  // 1. Find required data
  // ============================================

  // Find organizer
  const organizer = await prisma.organizer.findFirst();
  if (!organizer) {
    throw new Error('No organizer found. Run main seed first: npx prisma db seed');
  }

  // Find men's singles category
  const category = await prisma.category.findFirst({
    where: {
      type: 'SINGLES',
      gender: 'MEN',
      ageGroup: 'ALL_AGES'
    }
  });
  if (!category) {
    throw new Error('No men\'s singles category found. Run main seed first.');
  }

  // Find location
  const location = await prisma.location.findFirst();
  if (!location) {
    throw new Error('No location found. Run main seed first.');
  }

  // Find 11 male players
  const players = await prisma.playerProfile.findMany({
    where: { gender: 'MEN' },
    take: 11,
    orderBy: { name: 'asc' }
  });

  if (players.length < 11) {
    // Create additional players if needed
    console.log(`Found ${players.length} players, creating additional players...`);
    const neededPlayers = 11 - players.length;
    for (let i = 0; i < neededPlayers; i++) {
      const player = await prisma.playerProfile.create({
        data: {
          name: `Test Player ${players.length + i + 1}`,
          email: `testplayer${players.length + i + 1}@test.com`,
          phone: `+1555000${String(players.length + i + 1).padStart(4, '0')}`,
          birthDate: new Date(`198${i % 10}-0${(i % 9) + 1}-15`),
          gender: 'MEN',
          createdBy: organizer.userId
        }
      });
      players.push(player);
    }
  }

  console.log(`✅ Found ${players.length} players`);

  // ============================================
  // 2. Create Tournament
  // ============================================

  const tournament = await prisma.tournament.create({
    data: {
      name: 'Test Knockout Championship 2026',
      categoryId: category.id,
      description: '11-player knockout tournament for bracket view testing. First round completed.',
      locationId: location.id,
      organizerId: organizer.id,
      capacity: 16,
      entryFee: 25,
      prizeDescription: 'Trophy and bragging rights',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      registrationOpenDate: new Date('2025-12-01'),
      registrationCloseDate: new Date('2025-12-31'),
      status: 'IN_PROGRESS', // Active tournament
      formatType: 'KNOCKOUT',
      formatConfig: JSON.stringify({
        matchGuarantee: 'MATCH_1'
      }),
      defaultScoringRules: JSON.stringify({
        scoringFormat: 'SETS',
        winningSets: 2,
        winningGames: 6,
        advantageRule: 'ADVANTAGE',
        tiebreakTrigger: '6-6'
      }),
      waitlistDisplayOrder: 'REGISTRATION_TIME'
    }
  });

  console.log(`✅ Created tournament: ${tournament.name}`);

  // ============================================
  // 3. Register all 11 players
  // ============================================

  for (let i = 0; i < 11; i++) {
    await prisma.tournamentRegistration.create({
      data: {
        tournamentId: tournament.id,
        playerId: players[i].id,
        status: 'REGISTERED',
        registrationTimestamp: new Date(`2025-12-${String(i + 1).padStart(2, '0')}T10:00:00Z`)
      }
    });
  }

  console.log('✅ Registered all 11 players');

  // ============================================
  // 4. Create Bracket (MAIN)
  // ============================================

  const bracket = await prisma.bracket.create({
    data: {
      tournamentId: tournament.id,
      bracketType: 'MAIN',
      matchGuarantee: 'MATCH_1'
    }
  });

  console.log('✅ Created main bracket');

  // ============================================
  // 5. Create Rounds
  // ============================================

  // For 11 players, bracket size is 16:
  // Round 1: Preliminary (3 matches + 5 byes)
  // Round 2: Round of 8 (4 matches)
  // Round 3: Semifinals (2 matches)
  // Round 4: Final (1 match)

  const round1 = await prisma.round.create({
    data: {
      tournamentId: tournament.id,
      bracketId: bracket.id,
      roundNumber: 1
    }
  });

  const round2 = await prisma.round.create({
    data: {
      tournamentId: tournament.id,
      bracketId: bracket.id,
      roundNumber: 2
    }
  });

  const round3 = await prisma.round.create({
    data: {
      tournamentId: tournament.id,
      bracketId: bracket.id,
      roundNumber: 3
    }
  });

  const round4 = await prisma.round.create({
    data: {
      tournamentId: tournament.id,
      bracketId: bracket.id,
      roundNumber: 4
    }
  });

  console.log('✅ Created 4 rounds');

  // ============================================
  // 6. Create Matches
  // ============================================

  // 11-player bracket structure (from bracket-templates-all.json):
  // Structure: "1110 0101" where 0=preliminary match, 1=bye
  // Position mapping for 16-bracket:
  // Positions: 1-2, 3-4, 5-6, 7-8, 9-10, 11-12, 13-14, 15-16
  // Structure:  1     1    1    0      0      1      0      1
  //            BYE  BYE  BYE  MATCH  MATCH  BYE  MATCH  BYE

  // Seeding (by registration order, 1-11):
  // Seed 1: Position 1 (BYE) -> Player 1
  // Seed 2: Position 16 (BYE) -> Player 2
  // Seed 3: Position 8 (Match) -> Player 3
  // Seed 4: Position 9 (Match) -> Player 4
  // etc.

  // Simple seeding for 11 players into 16 bracket:
  // Players 1-5 get byes (top 5 seeds)
  // Players 6-11 play preliminary matches (seeds 6-11)

  // ROUND 1 - All 8 bracket positions (3 matches + 5 BYEs)
  // Bracket structure for 11 players: "1110 0101" (0=match, 1=bye)
  // Creating all matches including BYEs with matchNumber representing bracket position

  // Position 1 (matchNumber 1): BYE - Seed 1 (Alex Player)
  const bye1 = await prisma.match.create({
    data: {
      tournament: { connect: { id: tournament.id } },
      bracket: { connect: { id: bracket.id } },
      round: { connect: { id: round1.id } },
      matchNumber: 1,
      player1: { connect: { id: players[0].id } }, // Seed 1 - Alex Player
      status: 'BYE',
      isBye: true
    }
  });

  // Position 2 (matchNumber 2): BYE - Seed 2 (David Brown)
  const bye2 = await prisma.match.create({
    data: {
      tournament: { connect: { id: tournament.id } },
      bracket: { connect: { id: bracket.id } },
      round: { connect: { id: round1.id } },
      matchNumber: 2,
      player1: { connect: { id: players[1].id } }, // Seed 2 - David Brown
      status: 'BYE',
      isBye: true
    }
  });

  // Position 3 (matchNumber 3): BYE - Seed 3 (James Taylor)
  const bye3 = await prisma.match.create({
    data: {
      tournament: { connect: { id: tournament.id } },
      bracket: { connect: { id: bracket.id } },
      round: { connect: { id: round1.id } },
      matchNumber: 3,
      player1: { connect: { id: players[2].id } }, // Seed 3 - James Taylor
      status: 'BYE',
      isBye: true
    }
  });

  // Position 4 (matchNumber 4): MATCH - Seed 6 vs Seed 11 -> Player 6 wins
  const match1 = await prisma.match.create({
    data: {
      tournament: { connect: { id: tournament.id } },
      bracket: { connect: { id: bracket.id } },
      round: { connect: { id: round1.id } },
      matchNumber: 4,
      player1: { connect: { id: players[5].id } }, // Player 6 (seed 6) - Robert Wilson
      player2: { connect: { id: players[10].id } }, // Player 11 (seed 11) - Thomas Moore
      status: 'COMPLETED',
      result: JSON.stringify({
        winner: 'PLAYER1',
        sets: [
          { setNumber: 1, player1Score: 6, player2Score: 3 },
          { setNumber: 2, player1Score: 6, player2Score: 4 }
        ],
        finalScore: '2-0'
      }),
      completedAt: new Date('2026-01-15T14:30:00Z')
    }
  });

  // Position 5 (matchNumber 5): MATCH - Seed 7 vs Seed 10 -> Player 7 wins
  const match2 = await prisma.match.create({
    data: {
      tournament: { connect: { id: tournament.id } },
      bracket: { connect: { id: bracket.id } },
      round: { connect: { id: round1.id } },
      matchNumber: 5,
      player1: { connect: { id: players[6].id } }, // Player 7 (seed 7) - Test Player 10
      player2: { connect: { id: players[9].id } }, // Player 10 (seed 10) - Test Player 8
      status: 'COMPLETED',
      result: JSON.stringify({
        winner: 'PLAYER1',
        sets: [
          { setNumber: 1, player1Score: 6, player2Score: 2 },
          { setNumber: 2, player1Score: 7, player2Score: 5 }
        ],
        finalScore: '2-0'
      }),
      completedAt: new Date('2026-01-15T16:00:00Z')
    }
  });

  // Position 6 (matchNumber 6): BYE - Seed 4 (John Smith)
  const bye4 = await prisma.match.create({
    data: {
      tournament: { connect: { id: tournament.id } },
      bracket: { connect: { id: bracket.id } },
      round: { connect: { id: round1.id } },
      matchNumber: 6,
      player1: { connect: { id: players[3].id } }, // Seed 4 - John Smith
      status: 'BYE',
      isBye: true
    }
  });

  // Position 7 (matchNumber 7): MATCH - Seed 8 vs Seed 9 -> Player 9 wins (upset!)
  const match3 = await prisma.match.create({
    data: {
      tournament: { connect: { id: tournament.id } },
      bracket: { connect: { id: bracket.id } },
      round: { connect: { id: round1.id } },
      matchNumber: 7,
      player1: { connect: { id: players[7].id } }, // Player 8 (seed 8) - Test Player 12
      player2: { connect: { id: players[8].id } }, // Player 9 (seed 9) - Test Player 14
      status: 'COMPLETED',
      result: JSON.stringify({
        winner: 'PLAYER2',
        sets: [
          { setNumber: 1, player1Score: 4, player2Score: 6 },
          { setNumber: 2, player1Score: 6, player2Score: 4 },
          { setNumber: 3, player1Score: 3, player2Score: 6 }
        ],
        finalScore: '1-2'
      }),
      completedAt: new Date('2026-01-15T18:30:00Z')
    }
  });

  // Position 8 (matchNumber 8): BYE - Seed 5 (Mike Johnson)
  const bye5 = await prisma.match.create({
    data: {
      tournament: { connect: { id: tournament.id } },
      bracket: { connect: { id: bracket.id } },
      round: { connect: { id: round1.id } },
      matchNumber: 8,
      player1: { connect: { id: players[4].id } }, // Seed 5 - Mike Johnson
      status: 'BYE',
      isBye: true
    }
  });

  console.log('✅ Created 8 first-round positions (3 matches COMPLETED, 5 BYEs)');

  // ROUND 2 - Quarter-finals (4 matches)
  // Bracket progression: R1 positions 1-2 → R2M1, 3-4 → R2M2, 5-6 → R2M3, 7-8 → R2M4
  // matchNumber continues from Round 1 (9-12)

  // Match 9: Seed 1 (BYE from pos 1) vs Seed 2 (BYE from pos 2) -> SCHEDULED
  const match9 = await prisma.match.create({
    data: {
      tournament: { connect: { id: tournament.id } },
      bracket: { connect: { id: bracket.id } },
      round: { connect: { id: round2.id } },
      matchNumber: 9,
      player1: { connect: { id: players[0].id } }, // Player 1 - Alex Player (seed 1, BYE from pos 1)
      player2: { connect: { id: players[1].id } }, // Player 2 - David Brown (seed 2, BYE from pos 2)
      status: 'SCHEDULED'
    }
  });

  // Match 10: Seed 3 (BYE from pos 3) vs Winner of Match at pos 4 (Player 6) -> SCHEDULED
  const match10 = await prisma.match.create({
    data: {
      tournament: { connect: { id: tournament.id } },
      bracket: { connect: { id: bracket.id } },
      round: { connect: { id: round2.id } },
      matchNumber: 10,
      player1: { connect: { id: players[2].id } }, // Player 3 - James Taylor (seed 3, BYE from pos 3)
      player2: { connect: { id: players[5].id } }, // Player 6 - Robert Wilson (won at pos 4)
      status: 'SCHEDULED'
    }
  });

  // Match 11: Winner of Match at pos 5 (Player 7) vs Seed 4 (BYE from pos 6) -> SCHEDULED
  const match11 = await prisma.match.create({
    data: {
      tournament: { connect: { id: tournament.id } },
      bracket: { connect: { id: bracket.id } },
      round: { connect: { id: round2.id } },
      matchNumber: 11,
      player1: { connect: { id: players[6].id } }, // Player 7 - Test Player 10 (won at pos 5)
      player2: { connect: { id: players[3].id } }, // Player 4 - John Smith (seed 4, BYE from pos 6)
      status: 'SCHEDULED'
    }
  });

  // Match 12: Winner of Match at pos 7 (Player 9) vs Seed 5 (BYE from pos 8) -> SCHEDULED
  const match12 = await prisma.match.create({
    data: {
      tournament: { connect: { id: tournament.id } },
      bracket: { connect: { id: bracket.id } },
      round: { connect: { id: round2.id } },
      matchNumber: 12,
      player1: { connect: { id: players[8].id } }, // Player 9 - Test Player 14 (won at pos 7)
      player2: { connect: { id: players[4].id } }, // Player 5 - Mike Johnson (seed 5, BYE from pos 8)
      status: 'SCHEDULED'
    }
  });

  console.log('✅ Created 4 second-round matches (all SCHEDULED)');

  // ROUND 3 - Semifinals (2 matches) - TBD players
  // For TBD matches, we need placeholder players. Using first two players as placeholders.
  const match13 = await prisma.match.create({
    data: {
      tournament: { connect: { id: tournament.id } },
      bracket: { connect: { id: bracket.id } },
      round: { connect: { id: round3.id } },
      matchNumber: 13,
      player1: { connect: { id: players[0].id } }, // TBD - Winner of Match 9
      player2: { connect: { id: players[1].id } }, // TBD - Winner of Match 10
      status: 'SCHEDULED'
    }
  });

  const match14 = await prisma.match.create({
    data: {
      tournament: { connect: { id: tournament.id } },
      bracket: { connect: { id: bracket.id } },
      round: { connect: { id: round3.id } },
      matchNumber: 14,
      player1: { connect: { id: players[2].id } }, // TBD - Winner of Match 11
      player2: { connect: { id: players[3].id } }, // TBD - Winner of Match 12
      status: 'SCHEDULED'
    }
  });

  console.log('✅ Created 2 semifinal matches (all SCHEDULED)');

  // ROUND 4 - Final (1 match)
  const match15 = await prisma.match.create({
    data: {
      tournament: { connect: { id: tournament.id } },
      bracket: { connect: { id: bracket.id } },
      round: { connect: { id: round4.id } },
      matchNumber: 15,
      player1: { connect: { id: players[0].id } }, // TBD - Winner of Match 13
      player2: { connect: { id: players[1].id } }, // TBD - Winner of Match 14
      status: 'SCHEDULED'
    }
  });

  console.log('✅ Created final match (SCHEDULED)');

  // ============================================
  // Summary
  // ============================================

  console.log('\n🎉 Test data created successfully!\n');
  console.log('Tournament Summary:');
  console.log(`  Name: ${tournament.name}`);
  console.log(`  ID: ${tournament.id}`);
  console.log(`  Status: IN_PROGRESS`);
  console.log(`  Players: 11`);
  console.log(`  Bracket size: 16`);
  console.log(`  Matches created: 15 total (including BYEs)`);
  console.log(`    - Round 1: 8 positions (3 completed matches, 5 BYEs)`);
  console.log(`    - Round 2 (Quarter-finals): 4 scheduled`);
  console.log(`    - Round 3 (Semifinals): 2 scheduled`);
  console.log(`    - Round 4 (Final): 1 scheduled`);
  console.log('\nPlayer seeding:');
  players.slice(0, 11).forEach((p, i) => {
    const hasBye = i < 5;
    console.log(`  Seed ${i + 1}: ${p.name}${hasBye ? ' (BYE)' : ''}`);
  });
  console.log('\nBracket structure: "11100101" (0=match, 1=BYE)');
  console.log('Round 1 (8 positions):');
  console.log(`  Pos 1 (Match 1): BYE - ${players[0].name}`);
  console.log(`  Pos 2 (Match 2): BYE - ${players[1].name}`);
  console.log(`  Pos 3 (Match 3): BYE - ${players[2].name}`);
  console.log(`  Pos 4 (Match 4): ${players[5].name} def. ${players[10].name} 6-3, 6-4`);
  console.log(`  Pos 5 (Match 5): ${players[6].name} def. ${players[9].name} 6-2, 7-5`);
  console.log(`  Pos 6 (Match 6): BYE - ${players[3].name}`);
  console.log(`  Pos 7 (Match 7): ${players[8].name} def. ${players[7].name} 6-4, 4-6, 6-3 (upset!)`);
  console.log(`  Pos 8 (Match 8): BYE - ${players[4].name}`);
  console.log('\nRound 2 matchups (Quarter-finals):');
  console.log(`  Match 9: ${players[0].name} vs ${players[1].name}`);
  console.log(`  Match 10: ${players[2].name} vs ${players[5].name}`);
  console.log(`  Match 11: ${players[6].name} vs ${players[3].name}`);
  console.log(`  Match 12: ${players[8].name} vs ${players[4].name}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
