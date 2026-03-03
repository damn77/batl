import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { malePlayers, femalePlayers, mixedPairs, accountUsers } from './data/players.js';

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

  // --- 1a. Generic test users (keep exactly as-is for ACCT-03) ---
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
    },
    {
      email: 'player2@batl.example.com',
      password: 'Player123!',
      role: 'PLAYER',
      description: 'Test player 2 with account'
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

  const [admin, organizer, organizer2, playerUser, player2User] = createdUsers;

  // --- 1b. Real user accounts (Erich ADMIN, Rene ORGANIZER) ---
  console.log('\n👥 Creating real user accounts...\n');

  // Map email -> user for later profile linking
  const usersByEmail = {};
  for (const u of createdUsers) {
    usersByEmail[u.email] = u;
  }

  for (const accountData of accountUsers) {
    const passwordHash = await bcrypt.hash(accountData.password, SALT_ROUNDS);
    const user = await prisma.user.upsert({
      where: { email: accountData.email },
      update: {
        passwordHash: passwordHash,
        role: accountData.role,
        isActive: true,
        emailVerified: true
      },
      create: {
        email: accountData.email,
        passwordHash: passwordHash,
        role: accountData.role,
        isActive: true,
        emailVerified: true
      }
    });
    usersByEmail[user.email] = user;
    console.log(`✅ Real account: ${user.email} (${user.role})`);
  }

  // ============================================
  // 2. PLAYER PROFILES - Feature 001
  // ============================================
  console.log('\n🎾 Creating player profiles...\n');

  // --- 2a. Generic player profiles (keep exactly as-is for test coverage) ---
  const genericPlayerProfiles = [
    // Linked to user account
    { userId: playerUser.id, name: 'Alex Player', email: playerUser.email, phone: '+11234567890', birthDate: new Date('1990-05-15'), gender: 'MEN' },

    // Unlinked profiles - various ages and genders
    { userId: null, name: 'John Smith', email: 'john.smith@example.com', phone: '+12345678901', birthDate: new Date('1985-03-20'), gender: 'MEN' },
    { userId: null, name: 'Jane Doe', email: 'jane.doe@example.com', phone: '+12345678902', birthDate: new Date('1992-07-10'), gender: 'WOMEN' },
    { userId: null, name: 'Mike Johnson', email: 'mike.j@example.com', phone: '+12345678903', birthDate: new Date('1975-11-05'), gender: 'MEN' },
    { userId: null, name: 'Sarah Williams', email: 'sarah.w@example.com', phone: '+12345678904', birthDate: new Date('1988-01-25'), gender: 'WOMEN' },
    { userId: player2User.id, name: 'David Brown', email: 'david.b@example.com', phone: '+12345678905', birthDate: new Date('1983-09-15'), gender: 'MEN' },
    { userId: null, name: 'Emily Davis', email: 'emily.d@example.com', phone: '+12345678906', birthDate: new Date('1995-04-12'), gender: 'WOMEN' },
    { userId: null, name: 'Robert Wilson', email: 'robert.w@example.com', phone: '+12345678907', birthDate: new Date('1978-06-30'), gender: 'MEN' },
    { userId: null, name: 'Lisa Miller', email: 'lisa.m@example.com', phone: '+12345678908', birthDate: new Date('1987-12-20'), gender: 'WOMEN' },
    { userId: null, name: 'James Taylor', email: 'james.t@example.com', phone: '+12345678909', birthDate: new Date('1991-02-14'), gender: 'MEN' },
    { userId: null, name: 'Maria Garcia', email: 'maria.g@example.com', phone: '+12345678910', birthDate: new Date('1989-08-08'), gender: 'WOMEN' },
    { userId: null, name: 'Thomas Moore', email: 'thomas.m@example.com', phone: '+12345678911', birthDate: new Date('1982-10-22'), gender: 'MEN' },
    { userId: null, name: 'Jennifer Lee', email: 'jennifer.l@example.com', phone: '+12345678912', birthDate: new Date('1993-05-17'), gender: 'WOMEN' },
  ];

  const createdProfiles = [];
  for (const profileData of genericPlayerProfiles) {
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

  // --- 2b. Real player profiles (34 players from league data) ---
  console.log('\n🎾 Creating real league player profiles...\n');

  // Map email -> profile for pair creation
  const profilesByEmail = {};

  const allRealPlayers = [...malePlayers, ...femalePlayers];
  let phoneCounter = 1;

  for (const playerData of allRealPlayers) {
    // Determine userId: Erich and Rene have accounts
    const linkedUser = usersByEmail[playerData.email] || null;

    const profile = await prisma.playerProfile.upsert({
      where: { email: playerData.email },
      update: {
        name: playerData.name,
        birthDate: playerData.birthDate,
        gender: playerData.gender,
        // Update userId if account now exists
        userId: linkedUser ? linkedUser.id : undefined
      },
      create: {
        userId: linkedUser ? linkedUser.id : null,
        name: playerData.name,
        email: playerData.email,
        phone: `+421900${String(phoneCounter).padStart(6, '0')}`,
        birthDate: playerData.birthDate,
        gender: playerData.gender,
        createdBy: organizer.id
      }
    });
    profilesByEmail[playerData.email] = profile;
    phoneCounter++;
    console.log(`✅ ${profile.name} (${profile.gender}, born ${profile.birthDate.getFullYear()})`);
  }

  console.log(`\n✅ Total player profiles: ${createdProfiles.length} generic + ${allRealPlayers.length} real = ${createdProfiles.length + allRealPlayers.length}`);

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
  // 4. LOCATIONS — Replace all with ProSet only
  // ============================================
  console.log('\n📍 Creating tournament location...\n');

  // Remove any old generic locations that may exist from previous seeds
  await prisma.location.deleteMany({
    where: {
      clubName: {
        in: [
          'Central Tennis Club',
          'Riverside Sports Complex',
          'Northside Tennis Center',
          'Westside Indoor Courts'
        ]
      }
    }
  });

  // Create single real location: ProSet
  let prosetLocation = await prisma.location.findFirst({
    where: { clubName: 'ProSet' }
  });
  if (!prosetLocation) {
    prosetLocation = await prisma.location.create({
      data: { clubName: 'ProSet', address: 'Bratislava, Slovakia' }
    });
  }
  console.log(`✅ ${prosetLocation.clubName} (${prosetLocation.address})`);

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

  // Organizer profiles for Erich and Rene
  const erichUser = usersByEmail['erich@batl'];
  const erichOrganizerProfile = await prisma.organizer.upsert({
    where: { userId: erichUser.id },
    update: { name: 'Erich Siebenstich ml.', email: erichUser.email, phone: '+421900000003' },
    create: { userId: erichUser.id, name: 'Erich Siebenstich ml.', email: erichUser.email, phone: '+421900000003' }
  });
  console.log(`✅ ${erichOrganizerProfile.name} (real admin organizer)`);

  const reneUser = usersByEmail['rene@batl'];
  const reneOrganizerProfile = await prisma.organizer.upsert({
    where: { userId: reneUser.id },
    update: { name: 'Rene Parak', email: reneUser.email, phone: '+421900000016' },
    create: { userId: reneUser.id, name: 'Rene Parak', email: reneUser.email, phone: '+421900000016' }
  });
  console.log(`✅ ${reneOrganizerProfile.name} (real organizer)`);

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
      locationId: prosetLocation.id,
      backupLocationId: null,
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
      locationId: prosetLocation.id,
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
      locationId: prosetLocation.id,
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
      locationId: prosetLocation.id,
      backupLocationId: null,
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
      locationId: prosetLocation.id,
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

  // Register 8 players for combined tournament (use generic players for test coverage)
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

  // Define player groups (using generic profiles for ranking test data)
  const menGenericPlayers = createdProfiles.filter(p => p.gender === 'MEN');
  const womenGenericPlayers = createdProfiles.filter(p => p.gender === 'WOMEN');
  const men35Plus = menGenericPlayers.filter(p => {
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
  await seedRanking(mensOpenCategory, 'SINGLES', menGenericPlayers.slice(0, 8), 'PLAYER');

  // Women's Open (SINGLES)
  await seedRanking(womensOpenCategory, 'SINGLES', womenGenericPlayers.slice(0, 6), 'PLAYER');

  // Men's 35+ (SINGLES)
  await seedRanking(mens35Category, 'SINGLES', men35Plus.slice(0, 5), 'PLAYER');

  // ============================================
  // 10. DOUBLES PAIRS - Feature 006 (Doubles Pairs)
  // ============================================
  console.log('\n👯 Creating doubles pairs...\n');

  // --- 10a. Generic men's doubles pairs (keep for test coverage) ---
  const menWithRankings = menGenericPlayers.slice(0, 8);
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

  // --- 10b. Generic women's doubles pairs (keep for test coverage) ---
  const womensPairs = [];
  if (womenGenericPlayers.length >= 4) {
    const wPair1 = await prisma.doublesPair.create({
      data: {
        player1Id: womenGenericPlayers[0].id,
        player2Id: womenGenericPlayers[1].id,
        categoryId: womensDoublesCategory.id,
        seedingScore: 1720 // 900 + 820
      }
    });
    womensPairs.push(wPair1);
    console.log(`✅ Women's Pair 1: ${womenGenericPlayers[0].name} & ${womenGenericPlayers[1].name} (Seeding: 1720)`);

    const wPair2 = await prisma.doublesPair.create({
      data: {
        player1Id: womenGenericPlayers[2].id,
        player2Id: womenGenericPlayers[3].id,
        categoryId: womensDoublesCategory.id,
        seedingScore: 1400 // 740 + 660
      }
    });
    womensPairs.push(wPair2);
    console.log(`✅ Women's Pair 2: ${womenGenericPlayers[2].name} & ${womenGenericPlayers[3].name} (Seeding: 1400)`);
  }

  // --- 10c. Real mixed doubles pairs (18 pairs from league data) ---
  console.log('\n👯 Creating real mixed doubles pairs...\n');

  const realMixedPairs = [];
  for (let i = 0; i < mixedPairs.length; i++) {
    const pairDef = mixedPairs[i];
    const maleProfile = profilesByEmail[pairDef.maleKey];
    const femaleProfile = profilesByEmail[pairDef.femaleKey];

    if (!maleProfile) {
      console.error(`ERROR: Male player not found for key: ${pairDef.maleKey}`);
      continue;
    }
    if (!femaleProfile) {
      console.error(`ERROR: Female player not found for key: ${pairDef.femaleKey}`);
      continue;
    }

    // DoublesPair has unique constraint on (player1Id, player2Id, categoryId)
    // Check if this exact pair already exists to maintain idempotency
    const existing = await prisma.doublesPair.findFirst({
      where: {
        player1Id: maleProfile.id,
        player2Id: femaleProfile.id,
        categoryId: mixedDoublesCategory.id
      }
    });

    let pair;
    if (existing) {
      pair = existing;
    } else {
      pair = await prisma.doublesPair.create({
        data: {
          player1Id: maleProfile.id,
          player2Id: femaleProfile.id,
          categoryId: mixedDoublesCategory.id,
          seedingScore: 0 // No tournaments played yet (TOURN-02)
        }
      });
    }
    realMixedPairs.push(pair);
    console.log(`✅ Mixed Pair ${i + 1}: ${maleProfile.name} & ${femaleProfile.name}`);
  }
  console.log(`✅ Total real mixed pairs created: ${realMixedPairs.length}`);

  // ============================================
  // 11. PAIR REGISTRATIONS - Feature 006
  // ============================================
  console.log('\n📝 Creating pair registrations for doubles tournament...\n');

  // Register generic men's pairs for Summer Doubles Classic tournament
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

  // Men's Doubles (PAIR) — using generic pairs
  await seedRanking(mensDoublesCategory, 'PAIR', mensPairs, 'PAIR');

  // Women's Doubles (PAIR) — using generic pairs
  await seedRanking(womensDoublesCategory, 'PAIR', womensPairs, 'PAIR');

  // NOTE: No Mixed Doubles pair ranking created — no tournaments played yet (TOURN-02)
  // Mixed Doubles starts with zero ranking data

  // ============================================
  // 13. POINT TABLES - Feature 008 (Tournament Rankings)
  // ============================================
  console.log('\n📊 Creating default point tables for ranking system...\n');

  // Clear stale point table data before inserting corrected values
  await prisma.pointTable.deleteMany({});

  // Consolation rounds use the same roundName keys as main rounds (e.g. FINAL, SEMIFINAL).
  // The isConsolation flag distinguishes them. This keeps the lookup symmetric in the UI.
  const pointTables = [
    // Range: 2-4 participants
    { participantRange: '2-4', roundName: 'FINAL',      points: 10, isConsolation: false },
    { participantRange: '2-4', roundName: 'SEMIFINAL',  points:  7, isConsolation: false },
    { participantRange: '2-4', roundName: 'FINAL',      points:  5, isConsolation: true  },

    // Range: 5-8 participants
    { participantRange: '5-8', roundName: 'FINAL',        points: 13, isConsolation: false },
    { participantRange: '5-8', roundName: 'SEMIFINAL',    points: 10, isConsolation: false },
    { participantRange: '5-8', roundName: 'QUARTERFINAL', points:  7, isConsolation: false },
    { participantRange: '5-8', roundName: 'FINAL',        points:  5, isConsolation: true  },
    { participantRange: '5-8', roundName: 'SEMIFINAL',    points:  4, isConsolation: true  },

    // Range: 9-16 participants
    { participantRange: '9-16', roundName: 'FINAL',        points: 16, isConsolation: false },
    { participantRange: '9-16', roundName: 'SEMIFINAL',    points: 13, isConsolation: false },
    { participantRange: '9-16', roundName: 'QUARTERFINAL', points: 10, isConsolation: false },
    { participantRange: '9-16', roundName: 'FIRST_ROUND',  points:  7, isConsolation: false },
    { participantRange: '9-16', roundName: 'FINAL',        points:  6, isConsolation: true  },
    { participantRange: '9-16', roundName: 'SEMIFINAL',    points:  5, isConsolation: true  },
    { participantRange: '9-16', roundName: 'QUARTERFINAL', points:  4, isConsolation: true  },

    // Range: 17-32 participants
    { participantRange: '17-32', roundName: 'FINAL',         points: 19, isConsolation: false },
    { participantRange: '17-32', roundName: 'SEMIFINAL',     points: 16, isConsolation: false },
    { participantRange: '17-32', roundName: 'QUARTERFINAL',  points: 13, isConsolation: false },
    { participantRange: '17-32', roundName: 'SECOND_ROUND',  points: 10, isConsolation: false },
    { participantRange: '17-32', roundName: 'FIRST_ROUND',   points:  7, isConsolation: false },
    { participantRange: '17-32', roundName: 'FINAL',         points:  6, isConsolation: true  },
    { participantRange: '17-32', roundName: 'SEMIFINAL',     points:  5, isConsolation: true  },
    { participantRange: '17-32', roundName: 'QUARTERFINAL',  points:  4, isConsolation: true  },
    { participantRange: '17-32', roundName: 'FIRST_ROUND',   points:  3, isConsolation: true  },
  ];

  for (const tableData of pointTables) {
    await prisma.pointTable.create({ data: tableData });
  }

  console.log(`✅ Created ${pointTables.length} point table entries across 4 participant ranges`);
  console.log('   - 2-4 participants:  3 entries (2 main + 1 consolation)');
  console.log('   - 5-8 participants:  5 entries (3 main + 2 consolation)');
  console.log('   - 9-16 participants: 7 entries (4 main + 3 consolation)');
  console.log('   - 17-32 participants: 9 entries (5 main + 4 consolation)');

  // ============================================
  // REAL PLAYER CATEGORY REGISTRATIONS - TOURN-01
  // Register all 34 real players in Mixed Doubles Open
  // ============================================
  console.log('\n📋 Registering all real players in Mixed Doubles Open category...\n');

  let categoryRegCount = 0;
  for (const playerData of allRealPlayers) {
    const profile = profilesByEmail[playerData.email];
    if (!profile) continue;

    await prisma.categoryRegistration.upsert({
      where: {
        playerId_categoryId: {
          playerId: profile.id,
          categoryId: mixedDoublesCategory.id
        }
      },
      update: { status: 'ACTIVE' },
      create: {
        playerId: profile.id,
        categoryId: mixedDoublesCategory.id,
        status: 'ACTIVE'
      }
    });
    categoryRegCount++;
  }
  console.log(`✅ Registered ${categoryRegCount} real players in Mixed Doubles Open`);

  // ============================================
  // SUMMARY
  // ============================================
  const allProfilesCount = createdProfiles.length + allRealPlayers.length;
  const allUsersCount = createdUsers.length + accountUsers.length;

  console.log('\n========================================');
  console.log('✅ DATABASE SEED COMPLETED SUCCESSFULLY');
  console.log('========================================\n');

  console.log('📊 Summary of seeded data:\n');
  console.log(`👥 Users: ${allUsersCount}`);
  console.log('   - Generic accounts (5):');
  console.log('     admin@batl.example.com (ChangeMe123!)');
  console.log('     organizer@batl.example.com (Organizer123!)');
  console.log('     organizer2@batl.example.com (Organizer123!)');
  console.log('     player@batl.example.com (Player123!) → Alex Player');
  console.log('     player2@batl.example.com (Player123!) → David Brown');
  console.log('   - Real accounts (2):');
  console.log('     erich@batl (Erich123!) → Erich Siebenstich ml. [ADMIN]');
  console.log('     rene@batl (Rene123!) → Rene Parak [ORGANIZER]');

  console.log(`\n🎾 Player Profiles: ${allProfilesCount} total`);
  console.log(`   - ${createdProfiles.length} generic (test coverage)`);
  console.log(`   - ${allRealPlayers.length} real league players (${malePlayers.length} men, ${femalePlayers.length} women)`);

  console.log(`\n🏆 Categories: ${createdCategories.length}`);
  console.log('   - Singles: Open, 35+, 40+, 50+ (Men & Women)');
  console.log('   - Doubles: Open (Men, Women, Mixed), 40+ (Men)');

  console.log('\n📍 Locations: 1');
  console.log('   - ProSet (Bratislava, Slovakia)');

  console.log('\n🎾 Tournaments: 5 (all at ProSet)');
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
  console.log(`   - Men's Doubles: ${mensPairs.length} pairs (generic)`);
  console.log(`   - Women's Doubles: ${womensPairs.length} pairs (generic)`);
  console.log(`   - Mixed Doubles Open: ${realMixedPairs.length} real pairs (seedingScore: 0)`);
  console.log(`   - Pair registrations: ${mensPairs.length} for Summer Doubles Classic`);

  console.log(`\n📋 Category Registrations:`);
  console.log(`   - Mixed Doubles Open: ${categoryRegCount} real players registered`);

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
      locationId: prosetLocation.id,
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
        create: menGenericPlayers.slice(0, 5).map((p, i) => ({
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
  await seedRanking(mensDoublesCategory, 'MEN', menGenericPlayers.slice(0, 8), 'PLAYER');
  console.log(`✅ Created individual MEN ranking for Men's Doubles`);

  // T079: Tiebreaker test scenarios
  // Update two players to have same points
  if (menGenericPlayers.length >= 2) {
    const ranking = await prisma.ranking.findUnique({
      where: { categoryId_year_type: { categoryId: mensOpenCategory.id, year: currentYear, type: 'SINGLES' } }
    });

    if (ranking) {
      // Player 1: 1000 pts, 5 tournaments
      await prisma.rankingEntry.update({
        where: { rankingId_playerId: { rankingId: ranking.id, playerId: menGenericPlayers[0].id } },
        data: { totalPoints: 1000, tournamentCount: 5 }
      });

      // Player 2: 1000 pts, 3 tournaments (should be ranked higher due to fewer tournaments)
      await prisma.rankingEntry.update({
        where: { rankingId_playerId: { rankingId: ranking.id, playerId: menGenericPlayers[1].id } },
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
