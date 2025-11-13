// Complete API testing script for tournament rules
import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

const BASE_URL = 'http://localhost:3000';
const TOURNAMENT_ID = '520f224f-0b3e-494f-bccb-c177ceece290';

// Create axios instance with cookie jar support
const jar = new CookieJar();
const client = wrapper(axios.create({
  baseURL: BASE_URL,
  jar,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
}));

async function testAPI() {
  console.log('🧪 Tournament Rules API Testing\n');
  console.log('='.repeat(60));

  try {
    // Test 1: Login
    console.log('\n📝 Test 1: Login as Organizer');
    console.log('-'.repeat(60));
    const loginResponse = await client.post('/api/auth/login', {
      email: 'organizer@batl.example.com',
      password: 'Organizer123!'
    });
    console.log('✅ Login successful');
    console.log('User:', loginResponse.data.user?.email, '- Role:', loginResponse.data.user?.role);

    // Test 2: GET Tournament Format
    console.log('\n📝 Test 2: GET /api/v1/tournaments/:id/format');
    console.log('-'.repeat(60));
    const formatResponse = await client.get(`/api/v1/tournaments/${TOURNAMENT_ID}/format`);
    console.log('✅ Response:', JSON.stringify(formatResponse.data, null, 2));

    // Test 3: GET All Rule Overrides
    console.log('\n📝 Test 3: GET /api/v1/tournaments/:id/all-rules');
    console.log('-'.repeat(60));
    const overridesResponse = await client.get(`/api/v1/tournaments/${TOURNAMENT_ID}/all-rules`);
    console.log('✅ Response:', JSON.stringify(overridesResponse.data, null, 2));

    // Test 4: PATCH Tournament Format (change to GROUP)
    console.log('\n📝 Test 4: PATCH /api/v1/tournaments/:id/format');
    console.log('-'.repeat(60));
    console.log('Changing format to GROUP with groupSize 4...');
    const patchFormatResponse = await client.patch(`/api/v1/tournaments/${TOURNAMENT_ID}/format`, {
      formatType: 'GROUP',
      formatConfig: {
        formatType: 'GROUP',
        groupSize: 4
      }
    });
    console.log('✅ Response:', JSON.stringify(patchFormatResponse.data, null, 2));

    // Test 5: PATCH Default Scoring Rules (change to BIG_TIEBREAK)
    console.log('\n📝 Test 5: PATCH /api/v1/tournaments/:id/default-rules');
    console.log('-'.repeat(60));
    console.log('Changing scoring rules to BIG_TIEBREAK...');
    const patchRulesResponse = await client.patch(`/api/v1/tournaments/${TOURNAMENT_ID}/default-rules`, {
      formatType: 'BIG_TIEBREAK',
      winningTiebreaks: 1
    });
    console.log('✅ Response:', JSON.stringify(patchRulesResponse.data, null, 2));

    // Test 6: Verify changes
    console.log('\n📝 Test 6: Verify Changes - GET /api/v1/tournaments/:id/format');
    console.log('-'.repeat(60));
    const verifyResponse = await client.get(`/api/v1/tournaments/${TOURNAMENT_ID}/format`);
    console.log('✅ Updated Format:', JSON.stringify(verifyResponse.data.data, null, 2));

    // Test 7: Change back to KNOCKOUT
    console.log('\n📝 Test 7: Restore to KNOCKOUT format');
    console.log('-'.repeat(60));
    await client.patch(`/api/v1/tournaments/${TOURNAMENT_ID}/format`, {
      formatType: 'KNOCKOUT',
      formatConfig: {
        formatType: 'KNOCKOUT',
        matchGuarantee: 'MATCH_1'
      }
    });
    await client.patch(`/api/v1/tournaments/${TOURNAMENT_ID}/default-rules`, {
      formatType: 'SETS',
      winningSets: 2,
      advantageRule: 'ADVANTAGE',
      tiebreakTrigger: '6-6'
    });
    console.log('✅ Tournament restored to original KNOCKOUT format');

    console.log('\n' + '='.repeat(60));
    console.log('🎉 All API tests passed successfully!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      console.error('Status:', error.response.status);
    }
    process.exit(1);
  }
}

testAPI();
