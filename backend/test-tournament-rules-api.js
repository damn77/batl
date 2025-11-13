// Quick API test script for tournament rules endpoints
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Testing Tournament Rules API Data\n');

  // Check if we have any tournaments
  const tournaments = await prisma.tournament.findMany({
    include: {
      category: true
    }
  });

  console.log(`📊 Found ${tournaments.length} tournament(s):`);

  if (tournaments.length > 0) {
    tournaments.forEach((t, index) => {
      console.log(`\n${index + 1}. ${t.name} (ID: ${t.id})`);
      console.log(`   Category: ${t.category?.name || 'None'}`);
      console.log(`   Format Type: ${t.formatType}`);
      console.log(`   Format Config: ${t.formatConfig}`);
      console.log(`   Default Scoring Rules: ${t.defaultScoringRules}`);
      console.log(`   Status: ${t.status}`);
    });

    // Test with first tournament
    const firstTournament = tournaments[0];
    console.log(`\n✅ You can test these API endpoints with tournament ID: ${firstTournament.id}`);
    console.log(`\nGET endpoints (read-only, can test immediately):`);
    console.log(`- GET /api/v1/tournaments/${firstTournament.id}/format`);
    console.log(`- GET /api/v1/tournaments/${firstTournament.id}/all-rules`);

    // Check if there are any matches
    const matches = await prisma.match.findMany({
      where: { tournamentId: firstTournament.id },
      take: 1
    });

    if (matches.length > 0) {
      console.log(`- GET /api/v1/matches/${matches[0].id}/effective-rules`);
    } else {
      console.log(`- No matches yet for this tournament`);
    }

    console.log(`\nPATCH endpoints (requires ORGANIZER/ADMIN role):`);
    console.log(`- PATCH /api/v1/tournaments/${firstTournament.id}/format`);
    console.log(`- PATCH /api/v1/tournaments/${firstTournament.id}/default-rules`);
  } else {
    console.log('\n⚠️  No tournaments found in database.');
    console.log('You need to create a tournament first to test tournament rules API.');
  }

  // Check users
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true }
  });

  console.log(`\n\n👥 Found ${users.length} user(s):`);
  users.forEach(u => {
    console.log(`   - ${u.email} (${u.role})`);
  });

  const organizer = users.find(u => u.role === 'ORGANIZER' || u.role === 'ADMIN');
  if (organizer) {
    console.log(`\n✅ Use ${organizer.email} to test PATCH endpoints (requires ORGANIZER/ADMIN role)`);
  } else {
    console.log(`\n⚠️  No ORGANIZER or ADMIN user found. You can only test read-only GET endpoints.`);
  }
}

main()
  .catch(e => {
    console.error('Error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
