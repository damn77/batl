# Manual Regression Testing Guide - Feature 007

This guide outlines the manual testing procedures to verify that the refactoring changes have not introduced regressions.

## Prerequisites

- Backend server running (`npm run dev` in `backend/`)
- Frontend server running (`npm run dev` in `frontend/`)
- Test database with sample data

## Test Scenarios

### 1. Tournament Registration (Singles)

**Objective**: Verify that singles tournament registration still works correctly after refactoring.

**Steps**:
1. Navigate to a singles tournament page
2. As an organizer, open the registration panel
3. Select a player from the dropdown
4. Click "Register Player"
5. Verify success message appears
6. Verify player appears in the registered list

**Expected Result**: Player is successfully registered without errors.

---

### 2. Tournament Registration (Doubles)

**Objective**: Verify that doubles tournament registration still works correctly after refactoring.

**Steps**:
1. Navigate to a doubles tournament page
2. As an organizer, open the registration panel
3. Select a pair from the dropdown
4. Click "Register Pair"
5. Verify success message appears
6. Verify pair appears in the registered list

**Expected Result**: Pair is successfully registered without errors.

---

### 3. Waitlist Management (Tournament Full)

**Objective**: Verify waitlist functionality when tournament is at capacity.

**Steps**:
1. Fill a tournament to capacity (register players/pairs until full)
2. Attempt to register another player/pair
3. Verify waitlist modal appears with options:
   - "Add new player/pair to waitlist"
   - List of currently registered players/pairs to demote
4. Select "Add new player/pair to waitlist"
5. Click "Confirm and Register"
6. Verify new player/pair is added with WAITLISTED status

**Expected Result**: Waitlist modal functions correctly, new entity is waitlisted.

---

### 4. Waitlist Swap (Demotion)

**Objective**: Verify that organizers can swap a registered player/pair with a new one.

**Steps**:
1. With a full tournament, attempt to register a new player/pair
2. In the waitlist modal, select an existing registered player/pair to demote
3. Click "Confirm and Register"
4. Verify:
   - New player/pair is REGISTERED
   - Selected player/pair is now WAITLISTED

**Expected Result**: Atomic swap occurs correctly.

---

### 5. Rankings Display (Singles)

**Objective**: Verify that singles rankings display correctly with win rates.

**Steps**:
1. Navigate to a singles category leaderboard
2. Verify rankings show:
   - Rank position
   - Player name
   - Points
   - Wins/Losses
   - Win rate (calculated correctly)

**Expected Result**: All ranking data displays correctly with accurate win rates.

---

### 6. Rankings Display (Doubles)

**Objective**: Verify that doubles rankings display correctly with win rates.

**Steps**:
1. Navigate to a doubles category leaderboard
2. Verify rankings show:
   - Rank position
   - Pair names
   - Points
   - Wins/Losses
   - Win rate (calculated correctly)

**Expected Result**: All ranking data displays correctly with accurate win rates.

---

### 7. Withdrawal and Auto-Promotion

**Objective**: Verify that withdrawing a registered player/pair auto-promotes from waitlist.

**Steps**:
1. With a full tournament and waitlisted players/pairs:
2. Withdraw a REGISTERED player/pair
3. Verify:
   - Withdrawn player/pair status changes to WITHDRAWN
   - Oldest waitlisted player/pair is auto-promoted to REGISTERED

**Expected Result**: Auto-promotion occurs correctly (FIFO).

---

## Validation Checklist

- [ ] Singles registration works without errors
- [ ] Doubles registration works without errors
- [ ] Waitlist modal appears when tournament is full
- [ ] New entities can be added to waitlist
- [ ] Existing registrations can be demoted to waitlist
- [ ] Singles rankings display with correct win rates
- [ ] Doubles rankings display with correct win rates
- [ ] Withdrawal triggers auto-promotion from waitlist
- [ ] Error messages display correctly for validation failures
- [ ] Success messages display and auto-clear after 5 seconds

## Notes

- All refactored components should behave identically to the original implementation
- No new features were added, only code organization improved
- If any test fails, check the browser console for errors and report them
