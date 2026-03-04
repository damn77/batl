/**
 * Seed script for 11-player knockout tournament test data
 * Feature: 011-knockout-bracket-view
 * Depends on main seed: npx prisma db seed
 *
 * Creates:
 * - 1 knockout tournament (active, Jan 1 - Dec 31, 2026)
 * - 11 real BATL players registered
 * - First round completed (3 preliminary matches + 5 byes)
 *
 * Run: node prisma/seed-knockout-test.js
 */

import { PrismaClient } from '@prisma/client';
import { malePlayers } from './data/players.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating 11-player knockout tournament test data...\n');

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
    throw new Error("No men's singles category found. Run main seed first.");
  }

  // Find ProSet location
  const location = await prisma.location.findFirst({ where: { clubName: 'ProSet' } });
  if (!location) {
    throw new Error('No ProSet location found. Run main seed first: npx prisma db seed');
  }

  // Find 11 specific real players by email
  // Tomas Zaprazny, Laco Stevko, Erich Siebenstich ml., Juraj Macho, Patrik Kardos,
  // Zdeno Forgac, Michal Pomsar, Peter Fuchs, Marcel Sramko, Miro Uhliar, Roman Rummel
  const playerEmails = malePlayers.slice(0, 11).map(p => p.email);
  const players = [];
  for (const email of playerEmails) {
    const player = await prisma.playerProfile.findFirst({ where: { email } });
    if (!player) {
      throw new Error(`Player not found: ${email}. Run main seed first: npx prisma db seed`);
    }
    players.push(player);
  }

  console.log(`Found ${players.length} real players`);

  // ============================================
  // 2. Create Tournament
  // ============================================

  const tournament = await prisma.tournament.create({
    data: {
      name: 'ProSet Knockout Championship 2026',
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

  console.log(`Created tournament: ${tournament.name}`);

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

  console.log('Registered all 11 players');

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

  console.log('Created main bracket');

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

  console.log('Created 4 rounds');

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
  // Seed 1: Tomas Zaprazny - Position 1 (BYE)
  // Seed 2: Laco Stevko - Position 2 (BYE)
  // Seed 3: Erich Siebenstich ml. - Position 3 (BYE)
  // Seed 4: Juraj Macho - Position 6 (BYE)
  // Seed 5: Patrik Kardos - Position 8 (BYE)
  // Seed 6: Zdeno Forgac - Position 4 (Match vs Seed 11)
  // Seed 7: Michal Pomsar - Position 5 (Match vs Seed 10)
  // Seed 8: Peter Fuchs - Position 7 (Match vs Seed 9)
  // Seed 9: Marcel Sramko - Position 7 (Match, upsets Seed 8)
  // Seed 10: Miro Uhliar - Position 5 (Match, loses to Seed 7)
  // Seed 11: Roman Rummel - Position 4 (Match, loses to Seed 6)

  // ROUND 1 - All 8 bracket positions (3 matches + 5 BYEs)

  // Position 1 (matchNumber 1): BYE - Seed 1 (Tomas Zaprazny)
  const bye1 = await prisma.match.create({
    data: {
      tournament: { connect: { id: tournament.id } },
      bracket: { connect: { id: bracket.id } },
      round: { connect: { id: round1.id } },
      matchNumber: 1,
      player1: { connect: { id: players[0].id } }, // Seed 1 - Tomas Zaprazny
      status: 'BYE',
      isBye: true
    }
  });

  // Position 2 (matchNumber 2): BYE - Seed 2 (Laco Stevko)
  const bye2 = await prisma.match.create({
    data: {
      tournament: { connect: { id: tournament.id } },
      bracket: { connect: { id: bracket.id } },
      round: { connect: { id: round1.id } },
      matchNumber: 2,
      player1: { connect: { id: players[1].id } }, // Seed 2 - Laco Stevko
      status: 'BYE',
      isBye: true
    }
  });

  // Position 3 (matchNumber 3): BYE - Seed 3 (Erich Siebenstich ml.)
  const bye3 = await prisma.match.create({
    data: {
      tournament: { connect: { id: tournament.id } },
      bracket: { connect: { id: bracket.id } },
      round: { connect: { id: round1.id } },
      matchNumber: 3,
      player1: { connect: { id: players[2].id } }, // Seed 3 - Erich Siebenstich ml.
      status: 'BYE',
      isBye: true
    }
  });

  // Position 4 (matchNumber 4): MATCH - Seed 6 (Zdeno Forgac) vs Seed 11 (Roman Rummel) -> Forgac wins
  const match1 = await prisma.match.create({
    data: {
      tournament: { connect: { id: tournament.id } },
      bracket: { connect: { id: bracket.id } },
      round: { connect: { id: round1.id } },
      matchNumber: 4,
      player1: { connect: { id: players[5].id } }, // Seed 6 - Zdeno Forgac
      player2: { connect: { id: players[10].id } }, // Seed 11 - Roman Rummel
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

  // Position 5 (matchNumber 5): MATCH - Seed 7 (Michal Pomsar) vs Seed 10 (Miro Uhliar) -> Pomsar wins
  const match2 = await prisma.match.create({
    data: {
      tournament: { connect: { id: tournament.id } },
      bracket: { connect: { id: bracket.id } },
      round: { connect: { id: round1.id } },
      matchNumber: 5,
      player1: { connect: { id: players[6].id } }, // Seed 7 - Michal Pomsar
      player2: { connect: { id: players[9].id } }, // Seed 10 - Miro Uhliar
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

  // Position 6 (matchNumber 6): BYE - Seed 4 (Juraj Macho)
  const bye4 = await prisma.match.create({
    data: {
      tournament: { connect: { id: tournament.id } },
      bracket: { connect: { id: bracket.id } },
      round: { connect: { id: round1.id } },
      matchNumber: 6,
      player1: { connect: { id: players[3].id } }, // Seed 4 - Juraj Macho
      status: 'BYE',
      isBye: true
    }
  });

  // Position 7 (matchNumber 7): MATCH - Seed 8 (Peter Fuchs) vs Seed 9 (Marcel Sramko) -> Sramko wins (upset!)
  const match3 = await prisma.match.create({
    data: {
      tournament: { connect: { id: tournament.id } },
      bracket: { connect: { id: bracket.id } },
      round: { connect: { id: round1.id } },
      matchNumber: 7,
      player1: { connect: { id: players[7].id } }, // Seed 8 - Peter Fuchs
      player2: { connect: { id: players[8].id } }, // Seed 9 - Marcel Sramko
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

  // Position 8 (matchNumber 8): BYE - Seed 5 (Patrik Kardos)
  const bye5 = await prisma.match.create({
    data: {
      tournament: { connect: { id: tournament.id } },
      bracket: { connect: { id: bracket.id } },
      round: { connect: { id: round1.id } },
      matchNumber: 8,
      player1: { connect: { id: players[4].id } }, // Seed 5 - Patrik Kardos
      status: 'BYE',
      isBye: true
    }
  });

  console.log('Created 8 first-round positions (3 matches COMPLETED, 5 BYEs)');

  // ROUND 2 - Quarter-finals (4 matches)
  // Bracket progression: R1 positions 1-2 → R2M1, 3-4 → R2M2, 5-6 → R2M3, 7-8 → R2M4
  // matchNumber continues from Round 1 (9-12)

  // Match 9: Zaprazny (BYE from pos 1) vs Stevko (BYE from pos 2) -> SCHEDULED
  const match9 = await prisma.match.create({
    data: {
      tournament: { connect: { id: tournament.id } },
      bracket: { connect: { id: bracket.id } },
      round: { connect: { id: round2.id } },
      matchNumber: 9,
      player1: { connect: { id: players[0].id } }, // Seed 1 - Tomas Zaprazny (BYE from pos 1)
      player2: { connect: { id: players[1].id } }, // Seed 2 - Laco Stevko (BYE from pos 2)
      status: 'SCHEDULED'
    }
  });

  // Match 10: Siebenstich (BYE from pos 3) vs Forgac (won at pos 4) -> SCHEDULED
  const match10 = await prisma.match.create({
    data: {
      tournament: { connect: { id: tournament.id } },
      bracket: { connect: { id: bracket.id } },
      round: { connect: { id: round2.id } },
      matchNumber: 10,
      player1: { connect: { id: players[2].id } }, // Seed 3 - Erich Siebenstich ml. (BYE from pos 3)
      player2: { connect: { id: players[5].id } }, // Seed 6 - Zdeno Forgac (won at pos 4)
      status: 'SCHEDULED'
    }
  });

  // Match 11: Pomsar (won at pos 5) vs Macho (BYE from pos 6) -> SCHEDULED
  const match11 = await prisma.match.create({
    data: {
      tournament: { connect: { id: tournament.id } },
      bracket: { connect: { id: bracket.id } },
      round: { connect: { id: round2.id } },
      matchNumber: 11,
      player1: { connect: { id: players[6].id } }, // Seed 7 - Michal Pomsar (won at pos 5)
      player2: { connect: { id: players[3].id } }, // Seed 4 - Juraj Macho (BYE from pos 6)
      status: 'SCHEDULED'
    }
  });

  // Match 12: Sramko (won at pos 7, upset) vs Kardos (BYE from pos 8) -> SCHEDULED
  const match12 = await prisma.match.create({
    data: {
      tournament: { connect: { id: tournament.id } },
      bracket: { connect: { id: bracket.id } },
      round: { connect: { id: round2.id } },
      matchNumber: 12,
      player1: { connect: { id: players[8].id } }, // Seed 9 - Marcel Sramko (won at pos 7, upset)
      player2: { connect: { id: players[4].id } }, // Seed 5 - Patrik Kardos (BYE from pos 8)
      status: 'SCHEDULED'
    }
  });

  console.log('Created 4 second-round matches (all SCHEDULED)');

  // ROUND 3 - Semifinals (2 matches) - TBD players
  // Using top seeds as placeholders for the TBD bracket positions
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

  console.log('Created 2 semifinal matches (all SCHEDULED)');

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

  console.log('Created final match (SCHEDULED)');

  // ============================================
  // Summary
  // ============================================

  console.log('\nTest data created successfully!\n');
  console.log('Tournament Summary:');
  console.log(`  Name: ${tournament.name}`);
  console.log(`  ID: ${tournament.id}`);
  console.log(`  Location: ProSet`);
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
