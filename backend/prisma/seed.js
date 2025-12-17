import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

async function main() {
  console.log('🌱 Starting comprehensive database seed...\n');

  // ============================================
  // 1. USERS - Feature 001 (User Management)
  // ============================================
  console.log('👥 Creating users with different roles...\n');

  const testUsers = [
    {
      email: process.env.ADMIN_EMAIL || 'admin@batl.example.com',
      password: process.env.ADMIN_PASSWORD || 'ChangeMe123!',
      role: 'ADMIN',
      description: 'Admin user'
    },
    {
      email: 'organizer@batl.example.com',
      password: 'Organizer123!',
      role: 'ORGANIZER',
      description: 'Primary organizer'
    },
    {
      email: 'organizer2@batl.example.com',
      password: 'Organizer123!',
      role: 'ORGANIZER',
      description: 'Secondary organizer'
    },
    {
      email: 'player@batl.example.com',
      password: 'Player123!',
      role: 'PLAYER',
      description: 'Test player with account'
    }
  ];

  const createdUsers = [];
  for (const userData of testUsers) {
    const passwordHash = await bcrypt.hash(userData.password, SALT_ROUNDS);
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        passwordHash: passwordHash,
        role: userData.role,
        isActive: true,
        emailVerified: true
      },
      create: {
        email: userData.email,
        passwordHash: passwordHash,
        role: userData.role,
        isActive: true,
        emailVerified: true
      }
    });
    createdUsers.push(user);
    console.log(`✅ ${userData.description}: ${user.email}`);
  }

  const [admin, organizer, organizer2, playerUser] = createdUsers;

  // ============================================
  // 2. PLAYER PROFILES - Feature 001
  // ============================================
  console.log('\n🎾 Creating player profiles...\n');

  const playerProfiles = [
    // Linked to user account
    { userId: playerUser.id, name: 'Alex Player', email: playerUser.email, phone: '+11234567890', birthDate: new Date('1990-05-15'), gender: 'MEN' },

    // Unlinked profiles - various ages and genders
    { userId: null, name: 'John Smith', email: 'john.smith@example.com', phone: '+12345678901', birthDate: new Date('1985-03-20'), gender: 'MEN' },
    { userId: null, name: 'Jane Doe', email: 'jane.doe@example.com', phone: '+12345678902', birthDate: new Date('1992-07-10'), gender: 'WOMEN' },
    { userId: null, name: 'Mike Johnson', email: 'mike.j@example.com', phone: '+12345678903', birthDate: new Date('1975-11-05'), gender: 'MEN' },
    { userId: null, name: 'Sarah Williams', email: 'sarah.w@example.com', phone: '+12345678904', birthDate: new Date('1988-01-25'), gender: 'WOMEN' },
    { userId: null, name: 'David Brown', email: 'david.b@example.com', phone: '+12345678905', birthDate: new Date('1983-09-15'), gender: 'MEN' },
    { userId: null, name: 'Emily Davis', email: 'emily.d@example.com', phone: '+12345678906', birthDate: new Date('1995-04-12'), gender: 'WOMEN' },
    { userId: null, name: 'Robert Wilson', email: 'robert.w@example.com', phone: '+12345678907', birthDate: new Date('1978-06-30'), gender: 'MEN' },
    { userId: null, name: 'Lisa Miller', email: 'lisa.m@example.com', phone: '+12345678908', birthDate: new Date('1987-12-20'), gender: 'WOMEN' },
    { userId: null, name: 'James Taylor', email: 'james.t@example.com', phone: '+12345678909', birthDate: new Date('1991-02-14'), gender: 'MEN' },
    { userId: null, name: 'Maria Garcia', email: 'maria.g@example.com', phone: '+12345678910', birthDate: new Date('1989-08-08'), gender: 'WOMEN' },
    { userId: null, name: 'Thomas Moore', email: 'thomas.m@example.com', phone: '+12345678911', birthDate: new Date('1982-10-22'), gender: 'MEN' },
    { userId: null, name: 'Jennifer Lee', email: 'jennifer.l@example.com', phone: '+12345678912', birthDate: new Date('1993-05-17'), gender: 'WOMEN' },
  ];

  const createdProfiles = [];
  for (const profileData of playerProfiles) {
    const profile = await prisma.playerProfile.upsert({
      where: { email: profileData.email },
      update: {
        name: profileData.name,
        phone: profileData.phone,
        birthDate: profileData.birthDate,
        gender: profileData.gender
      },
      create: {
        userId: profileData.userId,
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
        birthDate: profileData.birthDate,
        gender: profileData.gender,
        createdBy: organizer.id
      }
    });
    createdProfiles.push(profile);
    console.log(`✅ ${profile.name} (${profile.gender}, born ${profile.birthDate.getFullYear()})`);
  }

  // ============================================
  // 3. CATEGORIES - Feature 002 (Category System)
  // ============================================
  console.log('\n🏆 Creating tournament categories...\n');

  const categories = [
    { type: 'SINGLES', ageGroup: 'ALL_AGES', gender: 'MEN', name: "Men's Singles Open" },
    { type: 'SINGLES', ageGroup: 'ALL_AGES', gender: 'WOMEN', name: "Women's Singles Open" },
    { type: 'SINGLES', ageGroup: 'AGE_35', gender: 'MEN', name: "Men's Singles 35+" },
    { type: 'SINGLES', ageGroup: 'AGE_35', gender: 'WOMEN', name: "Women's Singles 35+" },
    { type: 'SINGLES', ageGroup: 'AGE_40', gender: 'MEN', name: "Men's Singles 40+" },
    { type: 'SINGLES', ageGroup: 'AGE_50', gender: 'MEN', name: "Men's Singles 50+" },
    { type: 'DOUBLES', ageGroup: 'ALL_AGES', gender: 'MEN', name: "Men's Doubles Open" },
    { type: 'DOUBLES', ageGroup: 'ALL_AGES', gender: 'WOMEN', name: "Women's Doubles Open" },
    { type: 'DOUBLES', ageGroup: 'ALL_AGES', gender: 'MIXED', name: "Mixed Doubles Open" },
    { type: 'DOUBLES', ageGroup: 'AGE_40', gender: 'MEN', name: "Men's Doubles 40+" },
  ];

  const createdCategories = [];
  for (const categoryData of categories) {
    const category = await prisma.category.upsert({
      where: {
        type_ageGroup_gender: {
          type: categoryData.type,
          ageGroup: categoryData.ageGroup,
          gender: categoryData.gender
        }
      },
      update: { name: categoryData.name },
      create: categoryData
    });
    createdCategories.push(category);
    console.log(`✅ ${category.name}`);
  }

  // ============================================
  // 4. LOCATIONS - Feature 002/004
  // ============================================
  console.log('\n📍 Creating tournament locations...\n');

  const locations = [
    { clubName: 'Central Tennis Club', address: '123 Main St, Downtown, City' },
    { clubName: 'Riverside Sports Complex', address: '456 River Rd, Riverside, City' },
    { clubName: 'Northside Tennis Center', address: '789 North Ave, Northside, City' },
    { clubName: 'Westside Indoor Courts', address: '321 West Blvd, Westside, City' },
  ];

  const createdLocations = [];
  for (const locationData of locations) {
    let location = await prisma.location.findFirst({
      where: { clubName: locationData.clubName }
    });

    if (!location) {
      location = await prisma.location.create({
        data: locationData
      });
    }
    createdLocations.push(location);
    console.log(`✅ ${location.clubName}`);
  }

  // ============================================
  // 5. ORGANIZER PROFILES
  // ============================================
  console.log('\n👔 Creating organizer profiles...\n');

  const organizerProfile = await prisma.organizer.upsert({
    where: { userId: organizer.id },
    update: { name: 'Tournament Director', email: organizer.email, phone: '+15551234567' },
    create: { userId: organizer.id, name: 'Tournament Director', email: organizer.email, phone: '+15551234567' }
  });
  console.log(`✅ ${organizerProfile.name}`);

  const organizerProfile2 = await prisma.organizer.upsert({
    where: { userId: organizer2.id },
    update: { name: 'Assistant Director', email: organizer2.email, phone: '+15557654321' },
    create: { userId: organizer2.id, name: 'Assistant Director', email: organizer2.email, phone: '+15557654321' }
  });
  console.log(`✅ ${organizerProfile2.name}`);

  // ============================================
  // 6. TOURNAMENTS - Features 002/003/004/005
  // ============================================
  console.log('\n🎾 Creating tournaments with different formats...\n');

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const lastMonth = new Date(now);
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  // Tournament 1: KNOCKOUT format (upcoming, scheduled)
  const knockoutTournament = await prisma.tournament.create({
    data: {
      name: "Spring Singles Championship - Knockout",
      categoryId: createdCategories.find(c => c.name === "Men's Singles Open").id,
      description: "Single elimination tournament for men's open singles",
      locationId: createdLocations[0].id,
      backupLocationId: createdLocations[1].id,
      organizerId: organizerProfile.id,
      deputyOrganizerId: organizerProfile2.id,
      capacity: 16,
      entryFee: 50,
      prizeDescription: "$500 first place, $250 second place",
      startDate: nextWeek,
      endDate: new Date(nextWeek.getTime() + 2 * 24 * 60 * 60 * 1000),
      registrationOpenDate: now,
      registrationCloseDate: new Date(nextWeek.getTime() - 24 * 60 * 60 * 1000),
      status: 'SCHEDULED',
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
  console.log(`✅ ${knockoutTournament.name} (KNOCKOUT, SCHEDULED)`);

  // Tournament 2: GROUP format (upcoming, scheduled)
  const groupTournament = await prisma.tournament.create({
    data: {
      name: "Women's Summer League - Group Stage",
      categoryId: createdCategories.find(c => c.name === "Women's Singles Open").id,
      description: "Round-robin group stage tournament",
      locationId: createdLocations[1].id,
      organizerId: organizerProfile.id,
      capacity: 12,
      entryFee: 40,
      prizeDescription: "$300 first place, $150 second place",
      startDate: new Date(nextWeek.getTime() + 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(nextWeek.getTime() + 9 * 24 * 60 * 60 * 1000),
      registrationOpenDate: now,
      registrationCloseDate: new Date(nextWeek.getTime() + 6 * 24 * 60 * 60 * 1000),
      status: 'SCHEDULED',
      formatType: 'GROUP',
      formatConfig: JSON.stringify({
        groupSize: 4
      }),
      defaultScoringRules: JSON.stringify({
        scoringFormat: 'SETS',
        winningSets: 1,
        winningGames: 6,
        advantageRule: 'ADVANTAGE',
        tiebreakTrigger: '6-6'
      }),
      waitlistDisplayOrder: 'ALPHABETICAL'
    }
  });
  console.log(`✅ ${groupTournament.name} (GROUP, SCHEDULED)`);

  // Tournament 3: SWISS format (upcoming, scheduled)
  const swissTournament = await prisma.tournament.create({
    data: {
      name: "Masters 35+ Swiss Tournament",
      categoryId: createdCategories.find(c => c.name === "Men's Singles 35+").id,
      description: "5-round Swiss system for 35+ players",
      locationId: createdLocations[2].id,
      organizerId: organizerProfile2.id,
      capacity: 20,
      entryFee: 60,
      prizeDescription: "$400 first place, $200 second, $100 third",
      startDate: nextMonth,
      endDate: new Date(nextMonth.getTime() + 2 * 24 * 60 * 60 * 1000),
      registrationOpenDate: now,
      registrationCloseDate: new Date(nextMonth.getTime() - 3 * 24 * 60 * 60 * 1000),
      status: 'SCHEDULED',
      formatType: 'SWISS',
      formatConfig: JSON.stringify({
        rounds: 5
      }),
      defaultScoringRules: JSON.stringify({
        scoringFormat: 'SETS',
        winningSets: 2,
        winningGames: 6,
        advantageRule: 'ADVANTAGE',
        tiebreakTrigger: '6-6'
      })
    }
  });
  console.log(`✅ ${swissTournament.name} (SWISS, SCHEDULED)`);

  // Tournament 4: COMBINED format (active with groups and players - STARTS TODAY)
  const combinedTournament = await prisma.tournament.create({
    data: {
      name: "City Championship - Combined Format",
      categoryId: createdCategories.find(c => c.name === "Men's Singles Open").id,
      description: "Group stage followed by knockout bracket - Active tournament starting today!",
      locationId: createdLocations[0].id,
      backupLocationId: createdLocations[3].id,
      organizerId: organizerProfile.id,
      capacity: 8,
      entryFee: 75,
      prizeDescription: "$1000 champion, $500 runner-up, $250 semifinalists",
      startDate: now,
      endDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      registrationOpenDate: lastMonth,
      registrationCloseDate: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Closed yesterday
      status: 'IN_PROGRESS',
      formatType: 'COMBINED',
      formatConfig: JSON.stringify({
        groupSize: 4,
        advancePerGroup: 2
      }),
      defaultScoringRules: JSON.stringify({
        scoringFormat: 'SETS',
        winningSets: 1,
        winningGames: 6,
        advantageRule: 'ADVANTAGE',
        tiebreakTrigger: '6-6'
      }),
      waitlistDisplayOrder: 'REGISTRATION_TIME'
    }
  });
  console.log(`✅ ${combinedTournament.name} (COMBINED, IN_PROGRESS - STARTS TODAY)`);

  // Tournament 5: Doubles tournament
  const doublesTournament = await prisma.tournament.create({
    data: {
      name: "Summer Doubles Classic",
      categoryId: createdCategories.find(c => c.name === "Men's Doubles Open").id,
      description: "Open doubles tournament with round-robin",
      locationId: createdLocations[1].id,
      organizerId: organizerProfile.id,
      capacity: 16,
      entryFee: 100,
      prizeDescription: "$600 winners, $300 runners-up",
      startDate: new Date(nextWeek.getTime() + 14 * 24 * 60 * 60 * 1000),
      endDate: new Date(nextWeek.getTime() + 16 * 24 * 60 * 60 * 1000),
      registrationOpenDate: now,
      registrationCloseDate: new Date(nextWeek.getTime() + 12 * 24 * 60 * 60 * 1000),
      status: 'SCHEDULED',
      formatType: 'KNOCKOUT',
      formatConfig: JSON.stringify({
        matchGuarantee: 'MATCH_2'
      }),
      defaultScoringRules: JSON.stringify({
        scoringFormat: 'SETS',
        winningSets: 2,
        winningGames: 6,
        advantageRule: 'NO_AD',
        tiebreakTrigger: '6-6'
      }),
      waitlistDisplayOrder: 'REGISTRATION_TIME'
    }
  });
  console.log(`✅ ${doublesTournament.name} (KNOCKOUT, SCHEDULED)`);

  // ============================================
  // 7. TOURNAMENT REGISTRATIONS - Feature 003
  // ============================================
  console.log('\n📝 Creating tournament registrations...\n');

  // Register 8 players for combined tournament
  const eligiblePlayers = createdProfiles.filter(p => p.gender === 'MEN');
  for (let i = 0; i < Math.min(8, eligiblePlayers.length); i++) {
    await prisma.tournamentRegistration.create({
      data: {
        tournamentId: combinedTournament.id,
        playerId: eligiblePlayers[i].id,
        status: 'REGISTERED',
        registrationTimestamp: new Date(now.getTime() - (8 - i) * 60 * 60 * 1000)
      }
    });
  }
  console.log(`✅ Registered 8 players for ${combinedTournament.name}`);

  // Register some players for knockout tournament (6 registered, 2 waitlisted)
  for (let i = 0; i < 8 && i < eligiblePlayers.length; i++) {
    await prisma.tournamentRegistration.create({
      data: {
        tournamentId: knockoutTournament.id,
        playerId: eligiblePlayers[i].id,
        status: i < 6 ? 'REGISTERED' : 'WAITLISTED',
        registrationTimestamp: new Date(now.getTime() - (8 - i) * 60 * 60 * 1000)
      }
    });
  }
  console.log(`✅ Registered 6 + 2 waitlisted for ${knockoutTournament.name}`);

  // Register women for women's tournament
  const womenPlayers = createdProfiles.filter(p => p.gender === 'WOMEN');
  for (let i = 0; i < Math.min(8, womenPlayers.length); i++) {
    await prisma.tournamentRegistration.create({
      data: {
        tournamentId: groupTournament.id,
        playerId: womenPlayers[i].id,
        status: 'REGISTERED',
        registrationTimestamp: new Date(now.getTime() - (8 - i) * 60 * 60 * 1000)
      }
    });
  }
  console.log(`✅ Registered ${Math.min(8, womenPlayers.length)} players for ${groupTournament.name}`);

  // ============================================
  // 8. GROUPS FOR COMBINED TOURNAMENT - Feature 004/005
  // ============================================
  console.log('\n👥 Creating groups for combined tournament...\n');

  const group1 = await prisma.group.create({
    data: {
      tournamentId: combinedTournament.id,
      groupNumber: 1,
      groupSize: 4
    }
  });

  const group2 = await prisma.group.create({
    data: {
      tournamentId: combinedTournament.id,
      groupNumber: 2,
      groupSize: 4
    }
  });

  // Assign players to groups
  for (let i = 0; i < 4 && i < eligiblePlayers.length; i++) {
    await prisma.groupParticipant.create({
      data: {
        groupId: group1.id,
        playerId: eligiblePlayers[i].id,
        seedPosition: i + 1
      }
    });
  }

  for (let i = 4; i < 8 && i < eligiblePlayers.length; i++) {
    await prisma.groupParticipant.create({
      data: {
        groupId: group2.id,
        playerId: eligiblePlayers[i].id,
        seedPosition: i - 3
      }
    });
  }

  console.log(`✅ Created Group A and Group B with 4 players each`);

  // ============================================
  // 9. CATEGORY RANKINGS - Feature 008 (New System)
  // ============================================
  console.log('\n🏅 Creating category rankings (New System)...\n');

  const currentYear = new Date().getFullYear();

  // Define categories
  const mensOpenCategory = createdCategories.find(c => c.name === "Men's Singles Open");
  const womensOpenCategory = createdCategories.find(c => c.name === "Women's Singles Open");
  const mens35Category = createdCategories.find(c => c.name === "Men's Singles 35+");
  const mensDoublesCategory = createdCategories.find(c => c.name === "Men's Doubles Open");
  const womensDoublesCategory = createdCategories.find(c => c.name === "Women's Doubles Open");
  const mixedDoublesCategory = createdCategories.find(c => c.name === "Mixed Doubles Open");

  // Define player groups
  const menPlayers = createdProfiles.filter(p => p.gender === 'MEN');
  // womenPlayers is already defined above
  const men35Plus = menPlayers.filter(p => {
    const age = new Date().getFullYear() - p.birthDate.getFullYear();
    return age >= 35;
  });

  // Helper to create ranking and entries
  async function seedRanking(category, type, entities, entityType) {
    // Create Ranking
    const ranking = await prisma.ranking.upsert({
      where: {
        categoryId_year_type: {
          categoryId: category.id,
          year: currentYear,
          type: type
        }
      },
      update: {},
      create: {
        categoryId: category.id,
        year: currentYear,
        type: type
      }
    });

    // Create Entries
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const points = 1000 - i * 100;

      const entryData = {
        rankingId: ranking.id,
        entityType: entityType,
        rank: i + 1,
        totalPoints: points,
        tournamentCount: 5, // Mock data
        seedingScore: points // Mock data
      };

      if (entityType === 'PLAYER') {
        entryData.playerId = entity.id;
      } else {
        entryData.pairId = entity.id;
      }

      await prisma.rankingEntry.upsert({
        where: entityType === 'PLAYER'
          ? { rankingId_playerId: { rankingId: ranking.id, playerId: entity.id } }
          : { rankingId_pairId: { rankingId: ranking.id, pairId: entity.id } },
        update: entryData,
        create: entryData
      });
    }
    console.log(`✅ Created ${type} ranking for ${category.name} with ${entities.length} entries`);
    return ranking;
  }

  // Men's Open (SINGLES)
  await seedRanking(mensOpenCategory, 'SINGLES', menPlayers.slice(0, 8), 'PLAYER');

  // Women's Open (SINGLES)
  await seedRanking(womensOpenCategory, 'SINGLES', womenPlayers.slice(0, 6), 'PLAYER');

  // Men's 35+ (SINGLES)
  await seedRanking(mens35Category, 'SINGLES', men35Plus.slice(0, 5), 'PLAYER');

  // ============================================
  // 10. DOUBLES PAIRS - Feature 006 (Doubles Pairs)
  // ============================================
  console.log('\n👯 Creating doubles pairs...\n');



  // Create Men's Doubles pairs (using men players with rankings)
  const menWithRankings = menPlayers.slice(0, 8);
  const mensPairs = [];

  // Pair 1: Top ranked players (Alex + John)
  if (menWithRankings.length >= 2) {
    const pair1 = await prisma.doublesPair.create({
      data: {
        player1Id: menWithRankings[0].id,
        player2Id: menWithRankings[1].id,
        categoryId: mensDoublesCategory.id,
        seedingScore: 1900 // 1000 + 900
      }
    });
    mensPairs.push(pair1);
    console.log(`✅ Men's Pair 1: ${menWithRankings[0].name} & ${menWithRankings[1].name} (Seeding: 1900)`);
  }

  // Pair 2: Mid ranked players (Mike + David)
  if (menWithRankings.length >= 4) {
    const pair2 = await prisma.doublesPair.create({
      data: {
        player1Id: menWithRankings[2].id,
        player2Id: menWithRankings[3].id,
        categoryId: mensDoublesCategory.id,
        seedingScore: 1500 // 800 + 700
      }
    });
    mensPairs.push(pair2);
    console.log(`✅ Men's Pair 2: ${menWithRankings[2].name} & ${menWithRankings[3].name} (Seeding: 1500)`);
  }

  // Pair 3: Lower ranked players (Robert + James)
  if (menWithRankings.length >= 6) {
    const pair3 = await prisma.doublesPair.create({
      data: {
        player1Id: menWithRankings[4].id,
        player2Id: menWithRankings[5].id,
        categoryId: mensDoublesCategory.id,
        seedingScore: 1100 // 600 + 500
      }
    });
    mensPairs.push(pair3);
    console.log(`✅ Men's Pair 3: ${menWithRankings[4].name} & ${menWithRankings[5].name} (Seeding: 1100)`);
  }

  // Pair 4: Lowest ranked (Thomas + another)
  if (menWithRankings.length >= 8) {
    const pair4 = await prisma.doublesPair.create({
      data: {
        player1Id: menWithRankings[6].id,
        player2Id: menWithRankings[7].id,
        categoryId: mensDoublesCategory.id,
        seedingScore: 700 // 400 + 300
      }
    });
    mensPairs.push(pair4);
    console.log(`✅ Men's Pair 4: ${menWithRankings[6].name} & ${menWithRankings[7].name} (Seeding: 700)`);
  }

  // Create Women's Doubles pairs
  const womensPairs = [];
  if (womenPlayers.length >= 4) {
    const wPair1 = await prisma.doublesPair.create({
      data: {
        player1Id: womenPlayers[0].id,
        player2Id: womenPlayers[1].id,
        categoryId: womensDoublesCategory.id,
        seedingScore: 1720 // 900 + 820
      }
    });
    womensPairs.push(wPair1);
    console.log(`✅ Women's Pair 1: ${womenPlayers[0].name} & ${womenPlayers[1].name} (Seeding: 1720)`);

    const wPair2 = await prisma.doublesPair.create({
      data: {
        player1Id: womenPlayers[2].id,
        player2Id: womenPlayers[3].id,
        categoryId: womensDoublesCategory.id,
        seedingScore: 1400 // 740 + 660
      }
    });
    womensPairs.push(wPair2);
    console.log(`✅ Women's Pair 2: ${womenPlayers[2].name} & ${womenPlayers[3].name} (Seeding: 1400)`);
  }

  // Create Mixed Doubles pairs
  const mixedPairs = [];
  if (menPlayers.length >= 2 && womenPlayers.length >= 2) {
    const mxPair1 = await prisma.doublesPair.create({
      data: {
        player1Id: menPlayers[0].id,
        player2Id: womenPlayers[0].id,
        categoryId: mixedDoublesCategory.id,
        seedingScore: 1900 // 1000 + 900
      }
    });
    mixedPairs.push(mxPair1);
    console.log(`✅ Mixed Pair 1: ${menPlayers[0].name} & ${womenPlayers[0].name} (Seeding: 1900)`);

    const mxPair2 = await prisma.doublesPair.create({
      data: {
        player1Id: menPlayers[1].id,
        player2Id: womenPlayers[1].id,
        categoryId: mixedDoublesCategory.id,
        seedingScore: 1720 // 900 + 820
      }
    });
    mixedPairs.push(mxPair2);
    console.log(`✅ Mixed Pair 2: ${menPlayers[1].name} & ${womenPlayers[1].name} (Seeding: 1720)`);
  }

  // ============================================
  // 11. PAIR REGISTRATIONS - Feature 006
  // ============================================
  console.log('\n📝 Creating pair registrations for doubles tournament...\n');

  // Register pairs for Summer Doubles Classic tournament
  for (let i = 0; i < mensPairs.length; i++) {
    await prisma.pairRegistration.create({
      data: {
        tournamentId: doublesTournament.id,
        pairId: mensPairs[i].id,
        status: 'REGISTERED',
        registrationTimestamp: new Date(now.getTime() - (mensPairs.length - i) * 60 * 60 * 1000)
      }
    });
  }
  console.log(`✅ Registered ${mensPairs.length} pairs for ${doublesTournament.name}`);

  // ============================================
  // 12. PAIR RANKINGS - Feature 008 (New System)
  // ============================================
  console.log('\n🏅 Creating pair rankings (New System)...\n');

  // Men's Doubles (PAIR)
  await seedRanking(mensDoublesCategory, 'PAIR', mensPairs, 'PAIR');

  // Women's Doubles (PAIR)
  await seedRanking(womensDoublesCategory, 'PAIR', womensPairs, 'PAIR');

  // Mixed Doubles (PAIR)
  await seedRanking(mixedDoublesCategory, 'PAIR', mixedPairs, 'PAIR');

  // ============================================
  // 13. POINT TABLES - Feature 008 (Tournament Rankings)
  // ============================================
  console.log('\n📊 Creating default point tables for ranking system...\n');

  const pointTables = [
    // Range: 2-4 participants
    { participantRange: '2-4', roundName: 'FINAL', points: 20, isConsolation: false },
    { participantRange: '2-4', roundName: 'SEMIFINAL', points: 10, isConsolation: false },

    // Range: 5-8 participants
    { participantRange: '5-8', roundName: 'FINAL', points: 25, isConsolation: false },
    { participantRange: '5-8', roundName: 'SEMIFINAL', points: 15, isConsolation: false },
    { participantRange: '5-8', roundName: 'QUARTERFINAL', points: 8, isConsolation: false },
    { participantRange: '5-8', roundName: 'CONSOLATION_FINAL', points: 12, isConsolation: true },

    // Range: 9-16 participants
    { participantRange: '9-16', roundName: 'FINAL', points: 30, isConsolation: false },
    { participantRange: '9-16', roundName: 'SEMIFINAL', points: 20, isConsolation: false },
    { participantRange: '9-16', roundName: 'QUARTERFINAL', points: 10, isConsolation: false },
    { participantRange: '9-16', roundName: 'ROUND_16', points: 5, isConsolation: false },
    { participantRange: '9-16', roundName: 'CONSOLATION_FINAL', points: 15, isConsolation: true },
    { participantRange: '9-16', roundName: 'CONSOLATION_SEMIFINAL', points: 8, isConsolation: true },

    // Range: 17-32 participants
    { participantRange: '17-32', roundName: 'FINAL', points: 40, isConsolation: false },
    { participantRange: '17-32', roundName: 'SEMIFINAL', points: 28, isConsolation: false },
    { participantRange: '17-32', roundName: 'QUARTERFINAL', points: 18, isConsolation: false },
    { participantRange: '17-32', roundName: 'ROUND_16', points: 10, isConsolation: false },
    { participantRange: '17-32', roundName: 'ROUND_32', points: 5, isConsolation: false },
    { participantRange: '17-32', roundName: 'CONSOLATION_FINAL', points: 20, isConsolation: true },
    { participantRange: '17-32', roundName: 'CONSOLATION_SEMIFINAL', points: 12, isConsolation: true },
    { participantRange: '17-32', roundName: 'CONSOLATION_QUARTERFINAL', points: 6, isConsolation: true },
  ];

  for (const tableData of pointTables) {
    await prisma.pointTable.upsert({
      where: {
        participantRange_roundName_isConsolation: {
          participantRange: tableData.participantRange,
          roundName: tableData.roundName,
          isConsolation: tableData.isConsolation
        }
      },
      update: { points: tableData.points },
      create: tableData
    });
  }

  console.log(`✅ Created ${pointTables.length} point table entries across 4 participant ranges`);
  console.log('   - 2-4 participants: 2 rounds');
  console.log('   - 5-8 participants: 4 rounds (3 main + 1 consolation)');
  console.log('   - 9-16 participants: 6 rounds (4 main + 2 consolation)');
  console.log('   - 17-32 participants: 8 rounds (5 main + 3 consolation)');

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n========================================');
  console.log('✅ DATABASE SEED COMPLETED SUCCESSFULLY');
  console.log('========================================\n');

  console.log('📊 Summary of seeded data:\n');
  console.log(`👥 Users: ${createdUsers.length}`);
  console.log('   - 1 Admin: admin@batl.example.com (ChangeMe123!)');
  console.log('   - 2 Organizers: organizer@batl.example.com, organizer2@batl.example.com (Organizer123!)');
  console.log('   - 1 Player: player@batl.example.com (Player123!)');

  console.log(`\n🎾 Player Profiles: ${createdProfiles.length}`);
  console.log(`   - ${createdProfiles.filter(p => p.gender === 'MEN').length} Men`);
  console.log(`   - ${createdProfiles.filter(p => p.gender === 'WOMEN').length} Women`);
  console.log(`   - 1 with linked account, ${createdProfiles.length - 1} unlinked`);

  console.log(`\n🏆 Categories: ${createdCategories.length}`);
  console.log('   - Singles: Open, 35+, 40+, 50+ (Men & Women)');
  console.log('   - Doubles: Open (Men, Women, Mixed), 40+ (Men)');

  console.log(`\n📍 Locations: ${createdLocations.length}`);
  console.log('   - Central Tennis Club, Riverside Sports Complex, etc.');

  console.log('\n🎾 Tournaments: 5');
  console.log('   1. Spring Singles Championship (KNOCKOUT, 16 capacity)');
  console.log("   2. Women's Summer League (GROUP, 12 capacity)");
  console.log('   3. Masters 35+ Swiss (SWISS, 20 capacity)');
  console.log('   4. City Championship (COMBINED, 8 capacity) ← Active with players');
  console.log('   5. Summer Doubles Classic (KNOCKOUT, 16 capacity)');

  console.log('\n📝 Registrations:');
  console.log('   - City Championship: 8 registered players');
  console.log('   - Spring Singles: 6 registered + 2 waitlisted');
  console.log("   - Women's Summer League: 8 registered players");

  console.log('\n👥 Groups:');
  console.log('   - City Championship: Group A & B (4 players each)');

  console.log('\n🏅 Rankings:');
  console.log("   - Men's Open: 8 players ranked");
  console.log("   - Women's Open: 6 players ranked");
  console.log("   - Men's 35+: 5 players ranked");

  console.log('\n👯 Doubles Pairs:');
  console.log(`   - Men's Doubles: ${mensPairs.length} pairs`);
  console.log(`   - Women's Doubles: ${womensPairs.length} pairs`);
  console.log(`   - Mixed Doubles: ${mixedPairs.length} pairs`);
  console.log(`   - Pair registrations: ${mensPairs.length} for Summer Doubles Classic`);

  console.log('\n⚠️  IMPORTANT:');
  console.log('   - Change default passwords after first login!');
  console.log('   - Test tournament formats at: /player/tournaments');
  console.log('   - View tournament details at: /tournaments/:id');
  console.log('   - Manage tournaments at: /organizer/tournaments');
  console.log('   - Test doubles pairs at: /player/pairs');
  console.log('   - View pair rankings at: /rankings/pairs');

  console.log('\n🎉 Ready to test all features!\n');

  // ============================================
  // 14. PHASE 9 SEED DATA - Feature 008
  // ============================================
  console.log('\n📊 Creating Phase 9 seed data...\n');

  // T076: Create completed tournament
  const completedTournament = await prisma.tournament.create({
    data: {
      name: "Winter Open 2024",
      categoryId: mensOpenCategory.id,
      description: "Completed tournament from last year",
      locationId: createdLocations[0].id,
      organizerId: organizerProfile.id,
      capacity: 16,
      entryFee: 50,
      startDate: new Date('2024-12-01'),
      endDate: new Date('2024-12-03'),
      registrationOpenDate: new Date('2024-11-01'),
      registrationCloseDate: new Date('2024-11-25'),
      status: 'COMPLETED',
      formatType: 'KNOCKOUT',
      formatConfig: JSON.stringify({ matchGuarantee: 'MATCH_1' }),
      defaultScoringRules: JSON.stringify({
        scoringFormat: 'SETS',
        winningSets: 2,
        winningGames: 6,
        advantageRule: 'ADVANTAGE',
        tiebreakTrigger: '6-6'
      }),
      pointConfig: {
        create: {
          calculationMethod: 'PLACEMENT',
          multiplicativeValue: 1.0
        }
      }
    }
  });
  console.log(`✅ Created completed tournament: ${completedTournament.name}`);

  // T080: Create archived rankings for 2024
  const archivedYear = 2024;
  await prisma.ranking.create({
    data: {
      categoryId: mensOpenCategory.id,
      year: archivedYear,
      type: 'SINGLES',
      isArchived: true,
      entries: {
        create: menPlayers.slice(0, 5).map((p, i) => ({
          entityType: 'PLAYER',
          playerId: p.id,
          rank: i + 1,
          totalPoints: 500 - i * 50,
          tournamentCount: 3,
          seedingScore: 500 - i * 50
        }))
      }
    }
  });
  console.log(`✅ Created archived ranking for 2024`);

  // T081: Multiple rankings per doubles category
  await seedRanking(mensDoublesCategory, 'MEN', menPlayers.slice(0, 8), 'PLAYER');
  console.log(`✅ Created individual MEN ranking for Men's Doubles`);

  // T079: Tiebreaker test scenarios
  // Update two players to have same points
  if (menPlayers.length >= 2) {
    const ranking = await prisma.ranking.findUnique({
      where: { categoryId_year_type: { categoryId: mensOpenCategory.id, year: currentYear, type: 'SINGLES' } }
    });

    if (ranking) {
      // Player 1: 1000 pts, 5 tournaments
      await prisma.rankingEntry.update({
        where: { rankingId_playerId: { rankingId: ranking.id, playerId: menPlayers[0].id } },
        data: { totalPoints: 1000, tournamentCount: 5 }
      });

      // Player 2: 1000 pts, 3 tournaments (should be ranked higher due to fewer tournaments)
      await prisma.rankingEntry.update({
        where: { rankingId_playerId: { rankingId: ranking.id, playerId: menPlayers[1].id } },
        data: { totalPoints: 1000, tournamentCount: 3 }
      });
      console.log(`✅ Created tiebreaker scenario: Player 1 (1000pts, 5 tourneys) vs Player 2 (1000pts, 3 tourneys)`);
    }
  }

  console.log('\n✅ Seed data creation completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
