// Seed script for creating active tournament test data with real BATL players
// Depends on main seed: npx prisma db seed
import { PrismaClient } from '@prisma/client';
import { malePlayers } from './prisma/data/players.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed for active tournament test data...');

  // 1. Find or create SINGLES MEN 30+ category
  let category = await prisma.category.findFirst({
    where: {
      type: 'SINGLES',
      gender: 'MEN',
      ageGroup: 'AGE_30'
    }
  });

  if (!category) {
    category = await prisma.category.create({
      data: {
        type: 'SINGLES',
        gender: 'MEN',
        ageGroup: 'AGE_30',
        name: 'Singles Men 30+',
        description: 'Singles Men 30 and over'
      }
    });
    console.log('✓ Created category: SINGLES MEN 30+');
  } else {
    console.log('✓ Found existing category: SINGLES MEN 30+');
  }

  // 2. Find existing organizer user
  const organizer = await prisma.user.findFirst({
    where: { role: 'ORGANIZER' }
  });

  if (!organizer) {
    console.error('❌ No organizer user found. Run main seed first: npx prisma db seed');
    process.exit(1);
  }
  console.log('✓ Found existing organizer:', organizer.username || organizer.email);

  // 3. Find 8 real players by email from data file
  const playerEmails = malePlayers.slice(0, 8).map(p => p.email);
  // ['tomas@batl', 'laco@batl', 'erich@batl', 'juraj@batl', 'patrik@batl', 'zdeno@batl', 'michal@batl', 'peter@batl']

  const players = [];
  for (const email of playerEmails) {
    const player = await prisma.playerProfile.findFirst({ where: { email } });
    if (!player) {
      throw new Error(`Player not found: ${email}. Run main seed first: npx prisma db seed`);
    }
    players.push(player);
  }

  console.log(`✓ Found 8 real players: ${players.map(p => p.name).join(', ')}`);

  // 4. Find ProSet location
  const location = await prisma.location.findFirst({ where: { clubName: 'ProSet' } });
  if (!location) {
    throw new Error('No ProSet location found. Run main seed first: npx prisma db seed');
  }
  console.log('✓ Found ProSet location');

  // 5. Find or create organizer profile
  let organizerProfile = await prisma.organizer.findFirst({
    where: { userId: organizer.id }
  });

  if (!organizerProfile) {
    organizerProfile = await prisma.organizer.create({
      data: {
        userId: organizer.id,
        name: organizer.username || 'Tournament Organizer',
        email: organizer.email
      }
    });
    console.log('✓ Created organizer profile');
  } else {
    console.log('✓ Found existing organizer profile');
  }

  // 6. Create tournament
  const tournament = await prisma.tournament.create({
    data: {
      name: 'ProSet Active Tournament - Singles Men 30+',
      categoryId: category.id,
      description: 'Test tournament for rule change validation',
      locationId: location.id,
      organizerId: organizerProfile.id,
      startDate: new Date('2025-11-15'),
      endDate: new Date('2025-11-16'),
      status: 'SCHEDULED',
      // Combined format: groups of 4, 2 advancing
      formatType: 'COMBINED',
      formatConfig: JSON.stringify({
        formatType: 'COMBINED',
        groupSize: 4,
        advancePerGroup: 2
      }),
      // 1 set, advantage, standard tiebreak at 6-6
      defaultScoringRules: JSON.stringify({
        formatType: 'SETS',
        winningSets: 1,
        advantageRule: 'ADVANTAGE',
        tiebreakTrigger: '6-6'
      })
    }
  });

  console.log('✓ Created tournament:', tournament.name);

  // 7. Register all 8 players for the tournament
  for (const player of players) {
    await prisma.tournamentRegistration.create({
      data: {
        tournamentId: tournament.id,
        playerId: player.id,
        status: 'REGISTERED'
      }
    });
  }

  console.log('✓ Registered 8 players for the tournament');

  // 8. Create groups (Group 1: Zaprazny, Stevko, Siebenstich, Macho)
  //                  (Group 2: Kardos, Forgac, Pomsar, Fuchs)
  const group1 = await prisma.group.create({
    data: {
      tournamentId: tournament.id,
      groupNumber: 1,
      groupSize: 4
    }
  });

  const group2 = await prisma.group.create({
    data: {
      tournamentId: tournament.id,
      groupNumber: 2,
      groupSize: 4
    }
  });

  console.log('✓ Created 2 groups (Group 1, Group 2)');

  // 9. Assign players to groups
  // Group 1: players 0-3 (Zaprazny, Stevko, Siebenstich, Macho)
  for (let i = 0; i < 4; i++) {
    await prisma.groupParticipant.create({
      data: {
        groupId: group1.id,
        playerId: players[i].id,
        seedPosition: i + 1
      }
    });
  }

  // Group 2: players 4-7 (Kardos, Forgac, Pomsar, Fuchs)
  for (let i = 4; i < 8; i++) {
    await prisma.groupParticipant.create({
      data: {
        groupId: group2.id,
        playerId: players[i].id,
        seedPosition: i - 3
      }
    });
  }

  console.log('✓ Assigned 4 players to each group');

  // 10. Create matches for Group 1 (round-robin: 6 matches)
  // Group 1: Zaprazny(0) vs Stevko(1), Zaprazny(0) vs Siebenstich(2), etc.
  const group1Matches = [
    [0, 1], [0, 2], [0, 3],
    [1, 2], [1, 3],
    [2, 3]
  ];

  let matchNumber = 1;
  for (const [p1Idx, p2Idx] of group1Matches) {
    await prisma.match.create({
      data: {
        tournamentId: tournament.id,
        groupId: group1.id,
        player1Id: players[p1Idx].id,
        player2Id: players[p2Idx].id,
        matchNumber,
        status: 'SCHEDULED'
      }
    });
    matchNumber++;
  }

  console.log('✓ Created 6 matches for Group 1');

  // 11. Create matches for Group 2 (round-robin: 6 matches)
  // Group 2: Kardos(4) vs Forgac(5), Kardos(4) vs Pomsar(6), etc.
  const group2Matches = [
    [4, 5], [4, 6], [4, 7],
    [5, 6], [5, 7],
    [6, 7]
  ];

  for (const [p1Idx, p2Idx] of group2Matches) {
    await prisma.match.create({
      data: {
        tournamentId: tournament.id,
        groupId: group2.id,
        player1Id: players[p1Idx].id,
        player2Id: players[p2Idx].id,
        matchNumber,
        status: 'SCHEDULED'
      }
    });
    matchNumber++;
  }

  console.log('✓ Created 6 matches for Group 2');
  console.log('✓ Total: 12 group stage matches created');

  // Summary
  console.log('\n========================================');
  console.log('SEED COMPLETE - Active Tournament Summary:');
  console.log('========================================');
  console.log(`Tournament ID: ${tournament.id}`);
  console.log(`Tournament Name: ${tournament.name}`);
  console.log(`Location: ProSet`);
  console.log(`Category: SINGLES MEN 30+`);
  console.log(`Format: COMBINED (Groups of 4, 2 advancing)`);
  console.log(`Scoring: 1 set, advantage, standard tiebreak at 6-6`);
  console.log(`Players: 8 registered`);
  console.log(`  Group 1: ${players[0].name}, ${players[1].name}, ${players[2].name}, ${players[3].name}`);
  console.log(`  Group 2: ${players[4].name}, ${players[5].name}, ${players[6].name}, ${players[7].name}`);
  console.log(`Groups: 2 (Group 1, Group 2)`);
  console.log(`Matches: 12 scheduled (6 per group)`);
  console.log('========================================');
  console.log('\nUse this tournament to test rule changes during active tournaments.');
  console.log(`Navigate to: /organizer/tournament/${tournament.id}/rules`);
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
