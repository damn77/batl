// Seed script for creating test tournament with players for rule change testing
import { PrismaClient } from '@prisma/client';

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
  let organizer = await prisma.user.findFirst({
    where: { role: 'ORGANIZER' }
  });

  if (!organizer) {
    console.error('❌ No organizer user found. Please create an organizer user first.');
    process.exit(1);
  }
  console.log('✓ Found existing organizer:', organizer.username);

  // 3. Create 8 player profiles (or find existing ones)
  const playerNames = [
    'John Smith', 'Mike Johnson', 'David Williams', 'Robert Brown',
    'James Davis', 'William Miller', 'Richard Wilson', 'Thomas Moore'
  ];

  const players = [];
  for (const name of playerNames) {
    let player = await prisma.playerProfile.findFirst({
      where: {
        name
      }
    });

    if (!player) {
      player = await prisma.playerProfile.create({
        data: {
          name,
          birthDate: new Date('1990-01-01'), // All 34 years old (eligible for 30+)
          gender: 'MEN',
          email: `${name.toLowerCase().replace(' ', '.')}@test.com`,
          phone: `555-000${players.length + 1}`,
          createdBy: organizer.id
        }
      });
      console.log(`✓ Created player: ${name}`);
    } else {
      console.log(`✓ Found existing player: ${name}`);
    }

    players.push(player);
  }

  // 4. Create tournament
  const location = await prisma.location.create({
    data: {
      clubName: 'Test Tennis Club',
      address: '123 Test Street, Test City'
    }
  });

  // Find or create organizer profile
  let organizerProfile = await prisma.organizer.findFirst({
    where: { userId: organizer.id }
  });

  if (!organizerProfile) {
    organizerProfile = await prisma.organizer.create({
      data: {
        userId: organizer.id,
        organizationName: 'Test Organization'
      }
    });
    console.log('✓ Created organizer profile');
  } else {
    console.log('✓ Found existing organizer profile');
  }

  const tournament = await prisma.tournament.create({
    data: {
      name: 'Active Tournament Test - SINGLES MEN 30+',
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

  // 5. Register all 8 players for the tournament
  for (const player of players) {
    await prisma.tournamentRegistration.create({
      data: {
        tournamentId: tournament.id,
        playerId: player.id,
        status: "REGISTERED",
      }
    });
  }

  console.log('✓ Registered 8 players for the tournament');

  // 6. Create groups
  const group1 = await prisma.group.create({
    data: {
      tournamentId: tournament.id,
      name: 'Group A',
      groupNumber: 1
    }
  });

  const group2 = await prisma.group.create({
    data: {
      tournamentId: tournament.id,
      name: 'Group B',
      groupNumber: 2
    }
  });

  console.log('✓ Created 2 groups (Group A, Group B)');

  // 7. Assign players to groups
  // Group A: players 0-3
  for (let i = 0; i < 4; i++) {
    await prisma.groupParticipant.create({
      data: {
        groupId: group1.id,
        playerProfileId: players[i].id,
        position: i + 1
      }
    });
  }

  // Group B: players 4-7
  for (let i = 4; i < 8; i++) {
    await prisma.groupParticipant.create({
      data: {
        groupId: group2.id,
        playerProfileId: players[i].id,
        position: i - 3
      }
    });
  }

  console.log('✓ Assigned 4 players to each group');

  // 8. Create matches for Group A (round-robin: 6 matches total)
  const groupAMatches = [
    [0, 1], [0, 2], [0, 3], // Player 0 vs others
    [1, 2], [1, 3],         // Player 1 vs others
    [2, 3]                  // Player 2 vs Player 3
  ];

  let matchNumber = 1;
  for (const [p1Idx, p2Idx] of groupAMatches) {
    await prisma.match.create({
      data: {
        tournamentId: tournament.id,
        groupId: group1.id,
        player1Id: players[p1Idx].id,
        player2Id: players[p2Idx].id,
        matchNumber,
        scheduledTime: new Date('2025-11-15T09:00:00'),
        status: 'SCHEDULED'
      }
    });
    matchNumber++;
  }

  console.log('✓ Created 6 matches for Group A');

  // 9. Create matches for Group B (round-robin: 6 matches total)
  const groupBMatches = [
    [4, 5], [4, 6], [4, 7], // Player 4 vs others
    [5, 6], [5, 7],         // Player 5 vs others
    [6, 7]                  // Player 6 vs Player 7
  ];

  for (const [p1Idx, p2Idx] of groupBMatches) {
    await prisma.match.create({
      data: {
        tournamentId: tournament.id,
        groupId: group2.id,
        player1Id: players[p1Idx].id,
        player2Id: players[p2Idx].id,
        matchNumber,
        scheduledTime: new Date('2025-11-15T09:00:00'),
        status: 'SCHEDULED'
      }
    });
    matchNumber++;
  }

  console.log('✓ Created 6 matches for Group B');
  console.log('✓ Total: 12 group stage matches created');

  // Summary
  console.log('\n========================================');
  console.log('SEED COMPLETE - Test Data Summary:');
  console.log('========================================');
  console.log(`Tournament ID: ${tournament.id}`);
  console.log(`Tournament Name: ${tournament.name}`);
  console.log(`Category: SINGLES MEN 30+`);
  console.log(`Format: COMBINED (Groups of 4, 2 advancing)`);
  console.log(`Scoring: 1 set, advantage, standard tiebreak at 6-6`);
  console.log(`Players: 8 registered`);
  console.log(`Groups: 2 (Group A, Group B)`);
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
