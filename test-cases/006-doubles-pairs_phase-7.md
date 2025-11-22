# Manual Test Cases: 006-doubles-pairs Phase 6 Integration

**Feature**: Doubles Pair Management
**Phase**: 6-7 (Integration + Polish) - All Phases Complete
**Date**: 2025-11-22

## Overview

This document contains manual UI test cases for the doubles pairs feature after completing all user stories and polish tasks:
- US1: Player registers doubles pair for tournament
- US2: System manages pair lifecycle and rankings
- US3: Tournament seeding based on combined player strength
- US4: Organizer overrides eligibility requirements
- Phase 7: Tournament history, logging, and documentation

---

## Prerequisites

### Test Users
- **Admin**: admin@test.com / admin123
- **Organizer**: organizer@test.com / organizer123
- **Player 1**: player1@test.com / player123 (with linked player profile)
- **Player 2**: player2@test.com / player123 (with linked player profile)

### Required Data
- At least one DOUBLES category (e.g., "Men's Doubles U40")
- At least one tournament in SCHEDULED status using a DOUBLES category
- Multiple player profiles (at least 4-6 for pair testing)
- Seed data: Run `npx prisma db seed` to populate test data

---

## Test Suite 1: Pair Registration (US1)

### TC1.1: Register New Pair for DOUBLES Tournament

**Preconditions**: Logged in as Player, DOUBLES tournament available

**Steps**:
1. Navigate to Player Dashboard → "Tournament Registration"
2. Locate a DOUBLES tournament card
3. Click "Register" button
4. Verify Pair Registration modal opens
5. Select "Create new pair" option
6. Select another eligible player from the "Player 2" dropdown
7. Click "Register Pair"

**Expected Results**:
- Modal displays with tournament name in title
- Current user is pre-selected as Player 1
- Player 2 dropdown shows eligible players
- Success message: "Pair successfully registered for [Tournament Name]!"
- Registration button changes to "Unregister" with status badge
- Tournament card shows "REGISTERED" or "WAITLISTED" status

---

### TC1.2: Register Existing Pair for Tournament

**Preconditions**: Pair already exists for the category

**Steps**:
1. Navigate to Tournament Registration page
2. Click "Register" on a DOUBLES tournament
3. Select "Select existing pair" option
4. Choose a pair from the dropdown
5. Click "Register Pair"

**Expected Results**:
- Existing pairs appear in dropdown with format "Player1 & Player2 (X pts)"
- Registration succeeds without creating duplicate pair
- Success message displays correctly

---

### TC1.3: Prevent Duplicate Pair Registration

**Preconditions**: Pair already registered for the tournament

**Steps**:
1. Register a pair for a tournament (complete TC1.1)
2. Try to register the same pair again (via different browser/incognito)

**Expected Results**:
- Error: "This pair is already registered for this tournament"
- Registration state remains unchanged

---

### TC1.4: Re-register After Withdrawal

**Preconditions**: Pair previously registered then withdrawn

**Steps**:
1. Register a pair for tournament
2. Unregister (withdraw) from tournament
3. Attempt to register same pair again

**Expected Results**:
- Re-registration succeeds
- Status changes from WITHDRAWN to REGISTERED
- Success message displays

---

### TC1.5: Eligibility Validation - Ineligible Player

**Preconditions**: Player doesn't meet category requirements (wrong age/gender)

**Steps**:
1. Navigate to Tournament Registration
2. Click "Register" on a DOUBLES tournament
3. Select "Create new pair"
4. Select an ineligible player as Player 2

**Expected Results**:
- Eligibility violations display (e.g., "Player2 does not meet age requirement")
- "Register Pair" button remains enabled but submission fails
- Clear error message explaining why registration failed

---

## Test Suite 2: Tournament Page Display

### TC2.1: Display Registered Pairs on Tournament Page

**Preconditions**: DOUBLES tournament has registered pairs

**Steps**:
1. Navigate to tournament detail page: `/tournaments/{id}`
2. Scroll to "Registered Pairs" section

**Expected Results**:
- Header shows "Registered Pairs" (not "Registered Players")
- Table columns: #, Pair, Score, Seed, Status
- Pairs display as "Player1 & Player2"
- Seeding score shows combined ranking points
- Count badge shows "X / Y" (registered / capacity)

---

### TC2.2: Display Waitlisted Pairs

**Preconditions**: Tournament at capacity with waitlisted pairs

**Steps**:
1. Navigate to tournament detail page
2. Click "Waitlist (N players)" toggle button

**Expected Results**:
- Waitlist section expands
- Shows pairs in order based on tournament settings (registration time or alphabetical)
- Status badges show "WAITLISTED"
- Sorting indicator displays current sort method

---

### TC2.3: Search Pairs (>50 registrations)

**Preconditions**: Tournament with more than 50 registered pairs

**Steps**:
1. Navigate to tournament detail page
2. Enter player name in search box

**Expected Results**:
- Search box appears when >50 registrations
- Filters pairs containing the search term
- Works for either player in the pair
- Clear button resets search

**Note**
- not tested, generated test data needed

---

## Test Suite 3: Registration Button States

### TC3.1: Unregistered State

**Preconditions**: Player not registered for tournament

**Steps**:
1. Navigate to Tournament Registration page
2. View DOUBLES tournament card

**Expected Results**:
- "Register" button displayed (blue/primary)
- No status badge shown
- Button is enabled

---

### TC3.2: Registered State

**Preconditions**: Player's pair registered for tournament

**Steps**:
1. Register a pair for tournament
2. View tournament card

**Expected Results**:
- Status badge shows "REGISTERED" (green)
- "Unregister" button displayed (outline-danger)
- Status description tooltip available

---

### TC3.3: Waitlisted State

**Preconditions**: Tournament at capacity, pair on waitlist

**Steps**:
1. Register pair for full tournament
2. View tournament card

**Expected Results**:
- Status badge shows "WAITLISTED" (yellow/warning)
- "Unregister" button displayed
- Status description explains waitlist

---

### TC3.4: Withdrawn State

**Preconditions**: Player previously withdrew from tournament

**Steps**:
1. Register pair
2. Unregister from tournament
3. View tournament card

**Expected Results**:
- Status badge shows "WITHDRAWN" (gray)
- "Re-register" button displayed (outline-primary)
- Can successfully re-register

---

## Test Suite 4: Unregistration

### TC4.1: Unregister from DOUBLES Tournament

**Preconditions**: Logged in as player, pair registered for tournament

**Steps**:
1. Navigate to Tournament Registration page
2. Click "Unregister" on registered tournament
3. Confirm in modal dialog

**Expected Results**:
- Confirmation modal appears with tournament name
- Warning about waitlist promotion displayed
- Success message: "Successfully unregistered from [Tournament Name]"
- Button changes to "Re-register"
- Status shows "WITHDRAWN"

---

### TC4.2: Waitlist Promotion on Unregistration

**Preconditions**: Tournament at capacity with waitlist

**Steps**:
1. Register pairs until tournament full
2. Register one more pair (goes to waitlist)
3. Unregister a registered pair

**Expected Results**:
- Success message mentions promoted player: "Player has been promoted from the waitlist"
- Waitlisted pair now shows as REGISTERED
- Waitlist count decreases

---

### TC4.3: No Error After Successful Unregistration

**Preconditions**: Logged in as player in a pair

**Steps**:
1. Register a pair for DOUBLES tournament
2. Click "Unregister"
3. Confirm unregistration

**Expected Results**:
- Success message displays (no error)
- Tournament list refreshes correctly
- Button state updates to "Re-register"
- No console errors

---

## Test Suite 5: Pair Rankings (US2)

### TC5.1: View Pair Rankings Page

**Preconditions**: Pairs with rankings exist

**Steps**:
1. Navigate to Navigation → "Pair Rankings"
2. Select a DOUBLES category

**Expected Results**:
- Rankings table displays with columns: Rank, Player 1, Player 2, Points, Wins, Losses, Win Rate
- Pairs sorted by rank (points descending)
- Pagination controls work correctly

---

### TC5.2: Seeding Score Display

**Preconditions**: Pair registered for tournament

**Steps**:
1. View pair details or tournament registrations
2. Check seeding score value

**Expected Results**:
- Seeding score = sum of both players' individual ranking points
- Displays correctly in registration lists
- Updates when rankings change

---

## Test Suite 6: Organizer Override (US4)

### TC6.1: Override Eligibility as Organizer

**Preconditions**: Logged in as Organizer/Admin

**Steps**:
1. Navigate to Pair Registration page
2. Select tournament and ineligible pair
3. Check "Override eligibility requirements"
4. Enter override reason
5. Submit registration

**Expected Results**:
- Override checkbox appears (organizer/admin only)
- Reason field becomes required when checked
- Registration succeeds despite eligibility violations
- Override badge/indicator shown in registrations

---

### TC6.2: Override Reason Required

**Preconditions**: Logged in as Organizer

**Steps**:
1. Check override checkbox
2. Leave reason field empty
3. Try to submit

**Expected Results**:
- Validation error: "Override reason is required"
- Cannot submit without reason
- Clear indication of required field

---

### TC6.3: Player Cannot Override

**Preconditions**: Logged in as Player

**Steps**:
1. Navigate to Pair Registration
2. Attempt to register ineligible pair

**Expected Results**:
- No override checkbox visible
- Registration fails with eligibility errors
- Clear error messages for each violation

---

## Test Suite 7: Edge Cases

### TC7.1: Same Player Twice

**Steps**:
1. Try to create pair with same player for both positions

**Expected Results**:
- Error: "Cannot pair a player with themselves"
- Registration blocked

---

### TC7.2: SINGLES Tournament Registration

**Preconditions**: SINGLES category tournament available

**Steps**:
1. Click "Register" on SINGLES tournament

**Expected Results**:
- Individual registration (not pair modal)
- Registers current player directly
- No partner selection needed

---

### TC7.3: Category Type Detection

**Steps**:
1. View Tournament Registration page with both SINGLES and DOUBLES tournaments

**Expected Results**:
- SINGLES tournaments show direct "Register" flow
- DOUBLES tournaments show pair registration modal
- Category badges display correctly on cards

---

## Test Suite 8: Data Integrity

### TC8.1: Pair Uniqueness Per Category

**Steps**:
1. Create pair in Category A
2. Register same pair in Category B tournament

**Expected Results**:
- New pair record created for Category B
- Both pairs exist independently
- Correct category association

---

### TC8.2: Registration Count Accuracy

**Steps**:
1. View tournament page
2. Count displayed registrations
3. Compare with capacity badge

**Expected Results**:
- Registration count matches actual pairs
- Capacity shows correct format: "3 / 16"
- Waitlist count accurate

---

## Test Suite 9: Tournament History (Phase 7)

### TC9.1: View Pair History via API

**Preconditions**: Pair exists with tournament registrations

**Steps**:
1. Call GET `/api/v1/pairs/{pairId}/history`
2. Verify response structure

**Expected Results**:
- Response includes `pair` object with player names, category, seedingScore
- Response includes `stats` with rank, points, wins, losses, winRate (or null if no ranking)
- Response includes `history` array with tournament registrations
- Response includes `pagination` object
- History sorted by registrationTimestamp (newest first)

---

### TC9.2: Pair History Pagination

**Preconditions**: Pair with more than 10 tournament registrations

**Steps**:
1. Call GET `/api/v1/pairs/{pairId}/history?page=1&limit=5`
2. Verify first page results
3. Call GET `/api/v1/pairs/{pairId}/history?page=2&limit=5`
4. Verify second page results

**Expected Results**:
- First call returns 5 items
- Second call returns next 5 items
- `totalCount` reflects total registrations
- `totalPages` calculated correctly

---

### TC9.3: Pair History - No Registrations

**Preconditions**: Newly created pair with no registrations

**Steps**:
1. Create new pair
2. Call GET `/api/v1/pairs/{pairId}/history`

**Expected Results**:
- Response returns empty `history` array
- `stats` is null (no ranking yet)
- `totalCount` is 0

---

### TC9.4: Pair History - Invalid Pair ID

**Steps**:
1. Call GET `/api/v1/pairs/invalid-uuid/history`

**Expected Results**:
- Returns 404 status
- Error code: `PAIR_NOT_FOUND`
- Error message: "Pair not found"

---

## Notes

- All tests assume clean database state unless otherwise specified
- Run seed script before testing: `npx prisma db seed`
- Check browser console for any JavaScript errors during tests
- Test on multiple viewport sizes for responsive design
- Clear browser cache between test sessions if experiencing stale data

---

## Known Issues / Limitations

1. Tournament bracket visualization not yet implemented (deferred T059, T065)
2. Pair withdrawal from tournament detail view not yet implemented (deferred T051)
3. PairHistoryDisplay component created but not yet integrated into a page route

---

## Test Completion Checklist

- [x] TC1.1 - TC1.5: Pair Registration
- [x] TC2.1 - TC2.3: Tournament Page Display
- [x] TC3.1 - TC3.4: Registration Button States
- [x] TC4.1 - TC4.3: Unregistration
- [x] TC5.1 - TC5.2: Pair Rankings
- [x] TC6.1 - TC6.3: Organizer Override
- [ ] TC7.1 - TC7.3: Edge Cases
- [ ] TC8.1 - TC8.2: Data Integrity
- [ ] TC9.1 - TC9.4: Tournament History (Phase 7)

**Tested By**: _______________
**Date**: _______________
**Environment**: _______________
