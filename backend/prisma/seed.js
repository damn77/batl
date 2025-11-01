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
      email: process.env.ADMIN_EMAIL || 'admin@battle.example.com',
      password: process.env.ADMIN_PASSWORD || 'ChangeMe123!',
      role: 'ADMIN',
      description: 'Admin user'
    },
    {
      email: 'organizer@battle.example.com',
      password: 'Organizer123!',
      role: 'ORGANIZER',
      description: 'Test organizer user'
    },
    {
      email: 'player@battle.example.com',
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

  // Create player profile linked to the test player account
  const linkedProfile = await prisma.playerProfile.upsert({
    where: { userId: player.id },
    update: {
      name: 'Test Player',
      email: player.email,
      phone: '+11234567890'
    },
    create: {
      userId: player.id,
      name: 'Test Player',
      email: player.email,
      phone: '+11234567890',
      createdBy: organizer.id
    }
  });
  console.log(`✅ Player profile created (linked): ${linkedProfile.name}`);

  // Create some player profiles without linked accounts
  const unlinkedProfiles = [
    { name: 'John Smith', email: 'john.smith@example.com', phone: '+12345678901' },
    { name: 'Jane Doe', email: 'jane.doe@example.com', phone: null },
    { name: 'Mike Johnson', email: null, phone: '+13456789012' },
    { name: 'Sarah Williams', email: 'sarah.w@example.com', phone: '+14567890123' },
    { name: 'Tom Davis', email: null, phone: null }
  ];

  for (const profileData of unlinkedProfiles) {
    await prisma.playerProfile.create({
      data: {
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
        createdBy: organizer.id
      }
    });
    console.log(`✅ Player profile created (unlinked): ${profileData.name}`);
  }

  console.log('\n📊 Sample data summary:');
  console.log(`   - Users: ${createdUsers.length} (1 admin, 1 organizer, 1 player)`);
  console.log(`   - Player profiles: ${unlinkedProfiles.length + 1} (1 linked, ${unlinkedProfiles.length} unlinked)`);
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
