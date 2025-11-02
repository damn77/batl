import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

async function main() {
  console.log('🌱 Starting database seed...');

  // Define test users for all roles
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
      description: 'Test organizer user'
    },
    {
      email: 'player@batl.example.com',
      password: 'Player123!',
      role: 'PLAYER',
      description: 'Test player user'
    }
  ];

  console.log('Creating test users for all roles...\n');

  const createdUsers = [];

  for (const userData of testUsers) {
    console.log(`Creating ${userData.description}: ${userData.email}`);

    // Hash password
    const passwordHash = await bcrypt.hash(userData.password, SALT_ROUNDS);

    // Create or update user (upsert)
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        // Update password if user already exists
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
    console.log(`✅ ${userData.description} created: ${user.email} (${user.role})`);
  }

  console.log('\n📋 Summary of created users:');
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ Role      │ Email                      │ Password        │');
  console.log('├─────────────────────────────────────────────────────────────┤');
  for (const userData of testUsers) {
    const roleStr = userData.role.padEnd(9);
    const emailStr = userData.email.padEnd(26);
    const passStr = userData.password.padEnd(15);
    console.log(`│ ${roleStr} │ ${emailStr} │ ${passStr} │`);
  }
  console.log('└─────────────────────────────────────────────────────────────┘');

  // Create sample player profiles
  console.log('\n🎾 Creating sample player profiles...\n');

  const organizer = createdUsers.find(u => u.role === 'ORGANIZER');
  const player = createdUsers.find(u => u.role === 'PLAYER');

  // Create player profile linked to the test player account (T019 - with birthDate and gender)
  const linkedProfile = await prisma.playerProfile.upsert({
    where: { userId: player.id },
    update: {
      name: 'Test Player',
      email: player.email,
      phone: '+11234567890',
      birthDate: new Date('1987-05-15'), // Age 37
      gender: 'MEN'
    },
    create: {
      userId: player.id,
      name: 'Test Player',
      email: player.email,
      phone: '+11234567890',
      birthDate: new Date('1987-05-15'), // Age 37
      gender: 'MEN',
      createdBy: organizer.id
    }
  });
  console.log(`✅ Player profile created (linked): ${linkedProfile.name}`);

  // Create some player profiles without linked accounts (T019 - with birthDate and gender)
  const unlinkedProfiles = [
    { name: 'John Smith', email: 'john.smith@example.com', phone: '+12345678901', birthDate: new Date('1985-03-20'), gender: 'MEN' }, // Age 39
    { name: 'Jane Doe', email: 'jane.doe@example.com', phone: null, birthDate: new Date('1990-07-10'), gender: 'WOMEN' }, // Age 34
    { name: 'Mike Johnson', email: null, phone: '+13456789012', birthDate: new Date('1975-11-05'), gender: 'MEN' }, // Age 49
    { name: 'Sarah Williams', email: 'sarah.w@example.com', phone: '+14567890123', birthDate: new Date('1988-01-25'), gender: 'WOMEN' }, // Age 36
    { name: 'Tom Davis', email: null, phone: null, birthDate: new Date('1992-09-15'), gender: 'MEN' } // Age 32
  ];

  for (const profileData of unlinkedProfiles) {
    // Use upsert to handle existing profiles
    const profile = await prisma.playerProfile.upsert({
      where: { email: profileData.email || `temp-${profileData.name.replace(/\s/g, '-').toLowerCase()}` },
      update: {
        name: profileData.name,
        phone: profileData.phone,
        birthDate: profileData.birthDate,
        gender: profileData.gender
      },
      create: {
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
        birthDate: profileData.birthDate,
        gender: profileData.gender,
        createdBy: organizer.id
      }
    });
    console.log(`✅ Player profile created/updated (unlinked): ${profile.name}`);
  }

  // Create common tournament categories (T018)
  console.log('\n🏆 Creating common tournament categories...\n');

  const commonCategories = [
    // Men's Singles - All age groups
    { type: 'SINGLES', ageGroup: 'ALL_AGES', gender: 'MEN', name: "Men's Singles (All ages)", description: 'Open singles competition for men of all ages' },
    { type: 'SINGLES', ageGroup: 'AGE_20', gender: 'MEN', name: "Men's Singles 20+", description: 'Singles competition for men aged 20 and above' },
    { type: 'SINGLES', ageGroup: 'AGE_35', gender: 'MEN', name: "Men's Singles 35+", description: 'Singles competition for men aged 35 and above' },
    { type: 'SINGLES', ageGroup: 'AGE_50', gender: 'MEN', name: "Men's Singles 50+", description: 'Singles competition for men aged 50 and above' },

    // Women's Singles - Selected age groups
    { type: 'SINGLES', ageGroup: 'ALL_AGES', gender: 'WOMEN', name: "Women's Singles (All ages)", description: 'Open singles competition for women of all ages' },
    { type: 'SINGLES', ageGroup: 'AGE_35', gender: 'WOMEN', name: "Women's Singles 35+", description: 'Singles competition for women aged 35 and above' },

    // Mixed Doubles - Selected age groups
    { type: 'DOUBLES', ageGroup: 'ALL_AGES', gender: 'MIXED', name: "Mixed Doubles (All ages)", description: 'Open doubles competition for all ages and genders' },
    { type: 'DOUBLES', ageGroup: 'AGE_35', gender: 'MIXED', name: "Mixed Doubles 35+", description: 'Doubles competition for mixed teams aged 35 and above' },

    // Men's Doubles
    { type: 'DOUBLES', ageGroup: 'ALL_AGES', gender: 'MEN', name: "Men's Doubles (All ages)", description: 'Open doubles competition for men of all ages' },
    { type: 'DOUBLES', ageGroup: 'AGE_40', gender: 'MEN', name: "Men's Doubles 40+", description: 'Doubles competition for men aged 40 and above' },
  ];

  for (const categoryData of commonCategories) {
    await prisma.category.upsert({
      where: {
        type_ageGroup_gender: {
          type: categoryData.type,
          ageGroup: categoryData.ageGroup,
          gender: categoryData.gender
        }
      },
      update: {},
      create: categoryData
    });
    console.log(`✅ Category created: ${categoryData.name}`);
  }

  console.log('\n📊 Sample data summary:');
  console.log(`   - Users: ${createdUsers.length} (1 admin, 1 organizer, 1 player)`);
  console.log(`   - Player profiles: ${unlinkedProfiles.length + 1} (1 linked, ${unlinkedProfiles.length} unlinked)`);
  console.log(`   - Categories: ${commonCategories.length} (various types and age groups)`);
  console.log('');
  console.log('⚠️  IMPORTANT: Change the default passwords after first login!');
  console.log('');
  console.log('🎉 Database seed completed successfully!');
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
