#!/bin/bash
# Tournament Rules API Testing Script

echo "🧪 Testing Tournament Rules API Endpoints"
echo "=========================================="
echo ""

# Configuration
BASE_URL="http://localhost:3000"
TOURNAMENT_ID="520f224f-0b3e-494f-bccb-c177ceece290"
COOKIE_FILE="test-cookies.txt"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test 1: GET Tournament Format (no auth required for GET in our case)
echo -e "${BLUE}Test 1: GET /api/v1/tournaments/:id/format${NC}"
echo "Getting tournament format and default rules..."
curl -s "${BASE_URL}/api/v1/tournaments/${TOURNAMENT_ID}/format" \
  | python3 -m json.tool 2>/dev/null || echo "JSON parsing failed"
echo ""
echo "---"
echo ""

# Test 2: GET All Rule Overrides
echo -e "${BLUE}Test 2: GET /api/v1/tournaments/:id/all-rules${NC}"
echo "Getting all rule overrides at all levels..."
curl -s "${BASE_URL}/api/v1/tournaments/${TOURNAMENT_ID}/all-rules" \
  | python3 -m json.tool 2>/dev/null || echo "JSON parsing failed"
echo ""
echo "---"
echo ""

# Test 3: Try to login as organizer
echo -e "${BLUE}Test 3: Login as Organizer${NC}"
echo "Logging in with organizer@batl.example.com..."
curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"organizer@batl.example.com","password":"Organizer123!"}' \
  -c "${COOKIE_FILE}" \
  | python3 -m json.tool 2>/dev/null || echo "Login failed or JSON parsing failed"
echo ""
echo "---"
echo ""

# Test 4: PATCH Tournament Format (requires auth)
echo -e "${BLUE}Test 4: PATCH /api/v1/tournaments/:id/format${NC}"
echo "Updating tournament format to GROUP with groupSize 4..."
curl -s -X PATCH "${BASE_URL}/api/v1/tournaments/${TOURNAMENT_ID}/format" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_FILE}" \
  -d '{"formatType":"GROUP","formatConfig":{"formatType":"GROUP","groupSize":4}}' \
  | python3 -m json.tool 2>/dev/null || echo "Update failed or JSON parsing failed"
echo ""
echo "---"
echo ""

# Test 5: PATCH Default Scoring Rules (requires auth)
echo -e "${BLUE}Test 5: PATCH /api/v1/tournaments/:id/default-rules${NC}"
echo "Updating default scoring rules to Big Tiebreak format..."
curl -s -X PATCH "${BASE_URL}/api/v1/tournaments/${TOURNAMENT_ID}/default-rules" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_FILE}" \
  -d '{"formatType":"BIG_TIEBREAK","winningTiebreaks":1}' \
  | python3 -m json.tool 2>/dev/null || echo "Update failed or JSON parsing failed"
echo ""
echo "---"
echo ""

# Test 6: Verify changes with GET
echo -e "${BLUE}Test 6: Verify Changes - GET /api/v1/tournaments/:id/format${NC}"
echo "Getting updated tournament format..."
curl -s "${BASE_URL}/api/v1/tournaments/${TOURNAMENT_ID}/format" \
  | python3 -m json.tool 2>/dev/null || echo "JSON parsing failed"
echo ""
echo "---"
echo ""

# Cleanup
rm -f "${COOKIE_FILE}" 2>/dev/null

echo -e "${GREEN}✅ API Testing Complete!${NC}"
echo ""
echo "Next Steps:"
echo "- Check if all endpoints returned 200 status codes"
echo "- Verify the data format matches the API contracts"
echo "- Test the UI by navigating to the tournament rules pages"
