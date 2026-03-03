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
  // 6. TOURNAMENTS — Age-specific, all at ProSet
  // ============================================
  console.log('\n🎾 Creating realistic ProSet tournaments...\n');

  const now = new Date();
  const lastMonth = new Date(now);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const twoMonthsAgo = new Date(now);
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const nextTwoMonths = new Date(now);
  nextTwoMonths.setMonth(nextTwoMonths.getMonth() + 2);

  // Helper: default scoring rules for tennis sets
  const defaultScoringRules = JSON.stringify({
    scoringFormat: 'SETS',
    winningSets: 2,
    winningGames: 6,
    advantageRule: 'ADVANTAGE',
    tiebreakTrigger: '6-6'
  });

  // Tournament 1: COMPLETED knockout in Men's Singles 35+
  const tournament35Completed = await prisma.tournament.create({
    data: {
      name: 'ProSet 35+ Autumn Cup 2025',
      categoryId: createdCategories.find(c => c.name === "Men's Singles 35+").id,
      description: "Knockout tournament for 35+ men's singles — Autumn 2025 edition. Completed.",
      locationId: prosetLocation.id,
      organizerId: reneOrganizerProfile.id,
      capacity: 16,
      entryFee: 40,
      prizeDescription: 'Trophy + ProSet membership credit',
      startDate: new Date('2025-10-04'),
      endDate: new Date('2025-10-05'),
      registrationOpenDate: new Date('2025-09-01'),
      registrationCloseDate: new Date('2025-09-28'),
      status: 'COMPLETED',
      formatType: 'KNOCKOUT',
      formatConfig: JSON.stringify({ matchGuarantee: 'MATCH_1' }),
      defaultScoringRules,
      waitlistDisplayOrder: 'REGISTRATION_TIME'
    }
  });
  console.log(`✅ ${tournament35Completed.name} (KNOCKOUT, COMPLETED)`);

  // Tournament 2: IN_PROGRESS knockout in Men's Singles 40+
  const tournament40InProgress = await prisma.tournament.create({
    data: {
      name: 'ProSet 40+ Spring Open 2026',
      categoryId: createdCategories.find(c => c.name === "Men's Singles 40+").id,
      description: "Ongoing knockout tournament for 40+ men's singles — Spring 2026.",
      locationId: prosetLocation.id,
      organizerId: erichOrganizerProfile.id,
      capacity: 12,
      entryFee: 40,
      prizeDescription: 'Trophy + ProSet membership credit',
      startDate: lastMonth,
      endDate: nextMonth,
      registrationOpenDate: twoMonthsAgo,
      registrationCloseDate: new Date(lastMonth.getTime() - 3 * 24 * 60 * 60 * 1000),
      status: 'IN_PROGRESS',
      formatType: 'KNOCKOUT',
      formatConfig: JSON.stringify({ matchGuarantee: 'MATCH_1' }),
      defaultScoringRules,
      waitlistDisplayOrder: 'REGISTRATION_TIME'
    }
  });
  console.log(`✅ ${tournament40InProgress.name} (KNOCKOUT, IN_PROGRESS)`);

  // Tournament 3: SCHEDULED knockout in Men's Singles 50+
  const tournament50Scheduled = await prisma.tournament.create({
    data: {
      name: 'ProSet 50+ Summer Classic 2026',
      categoryId: createdCategories.find(c => c.name === "Men's Singles 50+").id,
      description: "Upcoming knockout tournament for 50+ men's singles — Summer 2026.",
      locationId: prosetLocation.id,
      organizerId: organizerProfile.id,
      capacity: 8,
      entryFee: 35,
      prizeDescription: 'Trophy',
      startDate: nextMonth,
      endDate: new Date(nextMonth.getTime() + 1 * 24 * 60 * 60 * 1000),
      registrationOpenDate: now,
      registrationCloseDate: new Date(nextMonth.getTime() - 7 * 24 * 60 * 60 * 1000),
      status: 'SCHEDULED',
      formatType: 'KNOCKOUT',
      formatConfig: JSON.stringify({ matchGuarantee: 'MATCH_1' }),
      defaultScoringRules,
      waitlistDisplayOrder: 'REGISTRATION_TIME'
    }
  });
  console.log(`✅ ${tournament50Scheduled.name} (KNOCKOUT, SCHEDULED)`);

  // Tournament 4: COMPLETED knockout in Men's Singles Open
  const tournamentOpenCompleted = await prisma.tournament.create({
    data: {
      name: 'ProSet Open Winter Championship 2025',
      categoryId: createdCategories.find(c => c.name === "Men's Singles Open").id,
      description: "Open men's singles winter championship — Completed December 2025.",
      locationId: prosetLocation.id,
      organizerId: erichOrganizerProfile.id,
      deputyOrganizerId: reneOrganizerProfile.id,
      capacity: 16,
      entryFee: 50,
      prizeDescription: 'Trophy + prize money',
      startDate: new Date('2025-12-06'),
      endDate: new Date('2025-12-07'),
      registrationOpenDate: new Date('2025-11-01'),
      registrationCloseDate: new Date('2025-11-30'),
      status: 'COMPLETED',
      formatType: 'KNOCKOUT',
      formatConfig: JSON.stringify({ matchGuarantee: 'MATCH_1' }),
      defaultScoringRules,
      waitlistDisplayOrder: 'REGISTRATION_TIME'
    }
  });
  console.log(`✅ ${tournamentOpenCompleted.name} (KNOCKOUT, COMPLETED)`);

  // Tournament 5: SCHEDULED in Women's Singles Open
  const tournamentWomensScheduled = await prisma.tournament.create({
    data: {
      name: "ProSet Women's Spring Cup 2026",
      categoryId: createdCategories.find(c => c.name === "Women's Singles Open").id,
      description: "Upcoming knockout tournament for women's open singles — Spring 2026.",
      locationId: prosetLocation.id,
      organizerId: organizerProfile2.id,
      capacity: 16,
      entryFee: 35,
      prizeDescription: 'Trophy + ProSet membership credit',
      startDate: nextTwoMonths,
      endDate: new Date(nextTwoMonths.getTime() + 1 * 24 * 60 * 60 * 1000),
      registrationOpenDate: now,
      registrationCloseDate: new Date(nextTwoMonths.getTime() - 7 * 24 * 60 * 60 * 1000),
      status: 'SCHEDULED',
      formatType: 'KNOCKOUT',
      formatConfig: JSON.stringify({ matchGuarantee: 'MATCH_1' }),
      defaultScoringRules,
      waitlistDisplayOrder: 'ALPHABETICAL'
    }
  });
  console.log(`✅ ${tournamentWomensScheduled.name} (KNOCKOUT, SCHEDULED)`);

  // Tournament 6: IN_PROGRESS in Men's Doubles Open
  const tournamentDoublesInProgress = await prisma.tournament.create({
    data: {
      name: "ProSet Men's Doubles Spring 2026",
      categoryId: createdCategories.find(c => c.name === "Men's Doubles Open").id,
      description: "Ongoing knockout doubles tournament for men's open — Spring 2026.",
      locationId: prosetLocation.id,
      organizerId: reneOrganizerProfile.id,
      capacity: 16,
      entryFee: 60,
      prizeDescription: 'Trophies for both partners',
      startDate: lastMonth,
      endDate: nextMonth,
      registrationOpenDate: twoMonthsAgo,
      registrationCloseDate: new Date(lastMonth.getTime() - 3 * 24 * 60 * 60 * 1000),
      status: 'IN_PROGRESS',
      formatType: 'KNOCKOUT',
      formatConfig: JSON.stringify({ matchGuarantee: 'MATCH_1' }),
      defaultScoringRules,
      waitlistDisplayOrder: 'REGISTRATION_TIME'
    }
  });
  console.log(`✅ ${tournamentDoublesInProgress.name} (KNOCKOUT, IN_PROGRESS)`);

  // NOTE: NO tournament in Mixed Doubles Open (TOURN-02)
  console.log('\n⚠️  Mixed Doubles Open: No tournament created — rankings start at zero (TOURN-02)');

  // ============================================
  // 7. TOURNAMENT REGISTRATIONS
  // ============================================
  console.log('\n📝 Creating tournament registrations...\n');

  // Helper to build index of real player profiles by birth year for age eligibility
  const realMaleProfiles = malePlayers.map(p => profilesByEmail[p.email]).filter(Boolean);
  const realFemaleProfiles = femalePlayers.map(p => profilesByEmail[p.email]).filter(Boolean);

  // 35+ eligible: born 1991 or earlier (age >= 35 in 2026)
  const males35Plus = realMaleProfiles.filter(p => p.birthDate.getFullYear() <= 1991);
  // 40+ eligible: born 1986 or earlier
  const males40Plus = realMaleProfiles.filter(p => p.birthDate.getFullYear() <= 1986);
  // 50+ eligible: born 1976 or earlier
  const males50Plus = realMaleProfiles.filter(p => p.birthDate.getFullYear() <= 1976);

  // Register 12 players for completed 35+ tournament (enough for a viable bracket)
  const reg35Players = males35Plus.slice(0, 12);
  for (let i = 0; i < reg35Players.length; i++) {
    await prisma.tournamentRegistration.create({
      data: {
        tournamentId: tournament35Completed.id,
        playerId: reg35Players[i].id,
        status: 'REGISTERED',
        registrationTimestamp: new Date('2025-09-10T10:00:00Z')
      }
    });
  }
  console.log(`✅ Registered ${reg35Players.length} players for ${tournament35Completed.name}`);

  // Register 10 players for in-progress 40+ tournament
  const reg40Players = males40Plus.slice(0, 10);
  for (let i = 0; i < reg40Players.length; i++) {
    await prisma.tournamentRegistration.create({
      data: {
        tournamentId: tournament40InProgress.id,
        playerId: reg40Players[i].id,
        status: 'REGISTERED',
        registrationTimestamp: new Date(twoMonthsAgo.getTime() + i * 60 * 60 * 1000)
      }
    });
  }
  console.log(`✅ Registered ${reg40Players.length} players for ${tournament40InProgress.name}`);

  // Register 4 players for scheduled 50+ tournament (all qualifying 50+ players)
  for (let i = 0; i < males50Plus.length; i++) {
    await prisma.tournamentRegistration.create({
      data: {
        tournamentId: tournament50Scheduled.id,
        playerId: males50Plus[i].id,
        status: 'REGISTERED',
        registrationTimestamp: new Date(now.getTime() + i * 60 * 60 * 1000)
      }
    });
  }
  console.log(`✅ Registered ${males50Plus.length} players for ${tournament50Scheduled.name}`);

  // Register 16 players for completed Open tournament (mix of real + generic)
  const genericMen = createdProfiles.filter(p => p.gender === 'MEN');
  const openPlayers = [...realMaleProfiles.slice(0, 10), ...genericMen.slice(0, 6)];
  for (let i = 0; i < openPlayers.length; i++) {
    await prisma.tournamentRegistration.create({
      data: {
        tournamentId: tournamentOpenCompleted.id,
        playerId: openPlayers[i].id,
        status: 'REGISTERED',
        registrationTimestamp: new Date('2025-11-10T10:00:00Z')
      }
    });
  }
  console.log(`✅ Registered ${openPlayers.length} players for ${tournamentOpenCompleted.name}`);

  // Register women for women's scheduled tournament (mix of real + generic)
  const genericWomen = createdProfiles.filter(p => p.gender === 'WOMEN');
  const womenPlayers = [...realFemaleProfiles.slice(0, 10), ...genericWomen.slice(0, 5)];
  for (let i = 0; i < womenPlayers.length; i++) {
    await prisma.tournamentRegistration.create({
      data: {
        tournamentId: tournamentWomensScheduled.id,
        playerId: womenPlayers[i].id,
        status: 'REGISTERED',
        registrationTimestamp: new Date(now.getTime() + i * 60 * 60 * 1000)
      }
    });
  }
  console.log(`✅ Registered ${womenPlayers.length} players for ${tournamentWomensScheduled.name}`);

  // ============================================
  // 8. GROUPS — None needed (all tournaments KNOCKOUT format)
  // ============================================
  console.log('\n📋 All tournaments use KNOCKOUT format — no group stage data needed\n');

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

  // Realistic ranking data profiles — pre-sorted descending by totalPoints
  // Points vary irregularly (not a ladder), tournament counts differ (3-8 range),
  // seedingScore < totalPoints (best N of M results)
  const RANKING_PROFILES = [
    { totalPoints: 1450, tournamentCount: 7, seedingScore: 1280 },
    { totalPoints: 1380, tournamentCount: 6, seedingScore: 1220 },
    { totalPoints: 1210, tournamentCount: 8, seedingScore: 1050 },
    { totalPoints: 1190, tournamentCount: 5, seedingScore: 1040 },
    { totalPoints: 980,  tournamentCount: 4, seedingScore: 900 },
    { totalPoints: 920,  tournamentCount: 7, seedingScore: 780 },
    { totalPoints: 870,  tournamentCount: 6, seedingScore: 740 },
    { totalPoints: 810,  tournamentCount: 3, seedingScore: 690 },
    { totalPoints: 750,  tournamentCount: 5, seedingScore: 620 },
    { totalPoints: 680,  tournamentCount: 8, seedingScore: 550 },
    { totalPoints: 620,  tournamentCount: 4, seedingScore: 520 },
    { totalPoints: 540,  tournamentCount: 6, seedingScore: 430 },
    { totalPoints: 490,  tournamentCount: 3, seedingScore: 410 },
    { totalPoints: 430,  tournamentCount: 7, seedingScore: 350 },
    { totalPoints: 380,  tournamentCount: 5, seedingScore: 300 },
    { totalPoints: 310,  tournamentCount: 4, seedingScore: 250 },
  ];

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
      const profile = RANKING_PROFILES[i % RANKING_PROFILES.length];

      const entryData = {
        rankingId: ranking.id,
        entityType: entityType,
        rank: i + 1,
        totalPoints: profile.totalPoints,
        tournamentCount: profile.tournamentCount,
        seedingScore: profile.seedingScore
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

  // Men's Open (SINGLES) — generic players for test data
  await seedRanking(mensOpenCategory, 'SINGLES', menGenericPlayers.slice(0, 8), 'PLAYER');

  // Women's Open (SINGLES) — generic players for test data
  await seedRanking(womensOpenCategory, 'SINGLES', womenGenericPlayers.slice(0, 6), 'PLAYER');

  // Men's 35+ (SINGLES) — generic players for test data
  await seedRanking(mens35Category, 'SINGLES', men35Plus.slice(0, 5), 'PLAYER');

  // Mixed Doubles Open rankings — all 18 pairs + individual MEN/WOMEN at 0 points
  // (Created below in section 10c after pairs are built — see mixedPairRankingDeferred flag)

  // ============================================
  // 10. DOUBLES PAIRS - Feature 006 + PAIR-02 (use real players)
  // ============================================
  console.log('\n👯 Creating doubles pairs with real players...\n');

  // --- 10a. Men's doubles pairs using REAL male players (PAIR-02) ---
  const mensDoublesCategory2 = mensDoublesCategory;
  const mensPairs = [];

  // Use top real male players by approximate ranking for men's doubles
  // Pair 1: Tomas Zaprazny + Erich Siebenstich (strong players)
  const mPairDefs = [
    { p1: 'tomas@batl', p2: 'erich@batl', score: 1900 },
    { p1: 'laco@batl',  p2: 'michal@batl', score: 1500 },
    { p1: 'juraj@batl', p2: 'miro@batl',   score: 1100 },
    { p1: 'patrik@batl', p2: 'marcel@batl', score: 700 },
  ];

  for (const def of mPairDefs) {
    const p1 = profilesByEmail[def.p1];
    const p2 = profilesByEmail[def.p2];
    if (!p1 || !p2) {
      console.error(`ERROR: Player not found for men's doubles pair: ${def.p1} / ${def.p2}`);
      continue;
    }
    const existingMPair = await prisma.doublesPair.findFirst({
      where: { player1Id: p1.id, player2Id: p2.id, categoryId: mensDoublesCategory2.id }
    });
    const pair = existingMPair ?? await prisma.doublesPair.create({
      data: {
        player1Id: p1.id,
        player2Id: p2.id,
        categoryId: mensDoublesCategory2.id,
        seedingScore: def.score
      }
    });
    mensPairs.push(pair);
    console.log(`✅ Men's Pair: ${p1.name} & ${p2.name} (Seeding: ${def.score})`);
  }

  // --- 10b. Women's doubles pairs using REAL female players (PAIR-02) ---
  const womensPairs = [];

  const wPairDefs = [
    { p1: 'simona@batl',   p2: 'lucia@batl',   score: 1720 },
    { p1: 'dominika@batl', p2: 'karolina@batl', score: 1400 },
  ];

  for (const def of wPairDefs) {
    const p1 = profilesByEmail[def.p1];
    const p2 = profilesByEmail[def.p2];
    if (!p1 || !p2) {
      console.error(`ERROR: Player not found for women's doubles pair: ${def.p1} / ${def.p2}`);
      continue;
    }
    const existingWPair = await prisma.doublesPair.findFirst({
      where: { player1Id: p1.id, player2Id: p2.id, categoryId: womensDoublesCategory.id }
    });
    const pair = existingWPair ?? await prisma.doublesPair.create({
      data: {
        player1Id: p1.id,
        player2Id: p2.id,
        categoryId: womensDoublesCategory.id,
        seedingScore: def.score
      }
    });
    womensPairs.push(pair);
    console.log(`✅ Women's Pair: ${p1.name} & ${p2.name} (Seeding: ${def.score})`);
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

  // Register real men's pairs for the in-progress Men's Doubles Spring 2026 tournament
  for (let i = 0; i < mensPairs.length; i++) {
    await prisma.pairRegistration.create({
      data: {
        tournamentId: tournamentDoublesInProgress.id,
        pairId: mensPairs[i].id,
        status: 'REGISTERED',
        registrationTimestamp: new Date(twoMonthsAgo.getTime() + i * 60 * 60 * 1000)
      }
    });
  }
  console.log(`✅ Registered ${mensPairs.length} pairs for ${tournamentDoublesInProgress.name}`);

  // ============================================
  // 12. PAIR RANKINGS - Feature 008 (New System)
  // ============================================
  console.log('\n🏅 Creating pair rankings (New System)...\n');

  // Men's Doubles (PAIR) — using real men's pairs
  await seedRanking(mensDoublesCategory, 'PAIR', mensPairs, 'PAIR');

  // Women's Doubles (PAIR) — using real women's pairs
  await seedRanking(womensDoublesCategory, 'PAIR', womensPairs, 'PAIR');

  // ============================================
  // MIXED DOUBLES OPEN RANKINGS — 0 points for all (TOURN-02)
  // Create PAIR, MEN, and WOMEN rankings with 0 points
  // ============================================
  console.log('\n🏅 Creating Mixed Doubles Open rankings (all at 0 points — TOURN-02)...\n');

  // PAIR ranking — one entry per mixed pair, all 0 points
  const mixedPairRanking = await prisma.ranking.upsert({
    where: {
      categoryId_year_type: {
        categoryId: mixedDoublesCategory.id,
        year: currentYear,
        type: 'PAIR'
      }
    },
    update: {},
    create: {
      categoryId: mixedDoublesCategory.id,
      year: currentYear,
      type: 'PAIR'
    }
  });

  for (let i = 0; i < realMixedPairs.length; i++) {
    const pair = realMixedPairs[i];
    await prisma.rankingEntry.upsert({
      where: { rankingId_pairId: { rankingId: mixedPairRanking.id, pairId: pair.id } },
      update: {
        entityType: 'PAIR',
        rank: i + 1,
        totalPoints: 0,
        tournamentCount: 0,
        seedingScore: 0
      },
      create: {
        rankingId: mixedPairRanking.id,
        entityType: 'PAIR',
        pairId: pair.id,
        rank: i + 1,
        totalPoints: 0,
        tournamentCount: 0,
        seedingScore: 0
      }
    });
  }
  console.log(`✅ Created PAIR ranking for Mixed Doubles Open: ${realMixedPairs.length} pairs at 0 points`);

  // MEN individual ranking — one entry per male player in mixed doubles
  const mixedMenRanking = await prisma.ranking.upsert({
    where: {
      categoryId_year_type: {
        categoryId: mixedDoublesCategory.id,
        year: currentYear,
        type: 'MEN'
      }
    },
    update: {},
    create: {
      categoryId: mixedDoublesCategory.id,
      year: currentYear,
      type: 'MEN'
    }
  });

  for (let i = 0; i < realMaleProfiles.length; i++) {
    const player = realMaleProfiles[i];
    await prisma.rankingEntry.upsert({
      where: { rankingId_playerId: { rankingId: mixedMenRanking.id, playerId: player.id } },
      update: {
        entityType: 'PLAYER',
        rank: i + 1,
        totalPoints: 0,
        tournamentCount: 0,
        seedingScore: 0
      },
      create: {
        rankingId: mixedMenRanking.id,
        entityType: 'PLAYER',
        playerId: player.id,
        rank: i + 1,
        totalPoints: 0,
        tournamentCount: 0,
        seedingScore: 0
      }
    });
  }
  console.log(`✅ Created MEN ranking for Mixed Doubles Open: ${realMaleProfiles.length} players at 0 points`);

  // WOMEN individual ranking — one entry per female player in mixed doubles
  const mixedWomenRanking = await prisma.ranking.upsert({
    where: {
      categoryId_year_type: {
        categoryId: mixedDoublesCategory.id,
        year: currentYear,
        type: 'WOMEN'
      }
    },
    update: {},
    create: {
      categoryId: mixedDoublesCategory.id,
      year: currentYear,
      type: 'WOMEN'
    }
  });

  for (let i = 0; i < realFemaleProfiles.length; i++) {
    const player = realFemaleProfiles[i];
    await prisma.rankingEntry.upsert({
      where: { rankingId_playerId: { rankingId: mixedWomenRanking.id, playerId: player.id } },
      update: {
        entityType: 'PLAYER',
        rank: i + 1,
        totalPoints: 0,
        tournamentCount: 0,
        seedingScore: 0
      },
      create: {
        rankingId: mixedWomenRanking.id,
        entityType: 'PLAYER',
        playerId: player.id,
        rank: i + 1,
        totalPoints: 0,
        tournamentCount: 0,
        seedingScore: 0
      }
    });
  }
  console.log(`✅ Created WOMEN ranking for Mixed Doubles Open: ${realFemaleProfiles.length} players at 0 points`);

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

  console.log('\n🎾 Tournaments: 6 (all at ProSet)');
  console.log(`   1. ${tournament35Completed.name} (KNOCKOUT, COMPLETED)`);
  console.log(`   2. ${tournament40InProgress.name} (KNOCKOUT, IN_PROGRESS)`);
  console.log(`   3. ${tournament50Scheduled.name} (KNOCKOUT, SCHEDULED)`);
  console.log(`   4. ${tournamentOpenCompleted.name} (KNOCKOUT, COMPLETED)`);
  console.log(`   5. ${tournamentWomensScheduled.name} (KNOCKOUT, SCHEDULED)`);
  console.log(`   6. ${tournamentDoublesInProgress.name} (KNOCKOUT, IN_PROGRESS)`);
  console.log('   ⚠️  Mixed Doubles Open: No tournament — rankings start at 0');

  console.log('\n📝 Tournament Registrations:');
  console.log(`   - 35+ Autumn Cup 2025: ${reg35Players.length} players (COMPLETED)`);
  console.log(`   - 40+ Spring Open 2026: ${reg40Players.length} players (IN_PROGRESS)`);
  console.log(`   - 50+ Summer Classic 2026: ${males50Plus.length} players (SCHEDULED)`);
  console.log(`   - Open Winter Championship 2025: ${openPlayers.length} players (COMPLETED)`);
  console.log(`   - Women's Spring Cup 2026: ${womenPlayers.length} players (SCHEDULED)`);
  console.log(`   - Men's Doubles Spring 2026: ${mensPairs.length} pairs registered`);

  console.log('\n🏅 Rankings:');
  console.log("   - Men's Open SINGLES: 8 generic players");
  console.log("   - Women's Open SINGLES: 6 generic players");
  console.log("   - Men's 35+ SINGLES: 5 generic players");
  console.log(`   - Mixed Doubles Open PAIR: ${realMixedPairs.length} pairs (0 pts each)`);
  console.log(`   - Mixed Doubles Open MEN: ${realMaleProfiles.length} players (0 pts each)`);
  console.log(`   - Mixed Doubles Open WOMEN: ${realFemaleProfiles.length} players (0 pts each)`);

  console.log('\n👯 Doubles Pairs:');
  console.log(`   - Men's Doubles: ${mensPairs.length} pairs (real players)`);
  console.log(`   - Women's Doubles: ${womensPairs.length} pairs (real players)`);
  console.log(`   - Mixed Doubles Open: ${realMixedPairs.length} real pairs (seedingScore: 0)`);

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
