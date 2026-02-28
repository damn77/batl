/**
 * Bracket utility functions for knockout tournament display
 * Feature: 011-knockout-bracket-view
 */

/**
 * Viewport constraints for zoom/pan navigation
 */
export const VIEWPORT_CONSTRAINTS = {
  MIN_SCALE: 0.25,
  MAX_SCALE: 4.0,
  DEFAULT_SCALE: 1.0,
  ZOOM_STEP: 0.25,
  PAN_SPEED: 1.0,
};

/**
 * Calculate the CSS Grid position for a match in the bracket
 * Matches are positioned vertically centered between their predecessor matches
 *
 * @param {number} roundNumber - 1-based round number (1 = first round)
 * @param {number} matchNumber - 1-based position within round
 * @param {number} totalRounds - Total number of rounds in bracket
 * @returns {{gridColumn: number, gridRowStart: number, gridRowEnd: number}}
 */
export function calculateMatchPosition(roundNumber, matchNumber, _totalRounds) {
  // Column is simply the round number
  const gridColumn = roundNumber;

  // Row spacing doubles with each round
  // Round 1: spacing = 1, matches at rows 1, 2, 3, 4...
  // Round 2: spacing = 2, matches centered between pairs
  // Round 3: spacing = 4, etc.
  const spacing = Math.pow(2, roundNumber - 1);
  const offset = spacing;

  // Calculate row position
  // First match in round starts at offset, subsequent matches spaced by 2*spacing
  const gridRowStart = (matchNumber - 1) * spacing * 2 + offset;
  const gridRowEnd = gridRowStart + spacing;

  return { gridColumn, gridRowStart, gridRowEnd };
}

/**
 * Calculate total grid rows needed for a bracket
 * @param {number} firstRoundMatches - Number of matches in first round
 * @returns {number} Total grid rows needed
 */
export function calculateTotalGridRows(firstRoundMatches) {
  // Need 2 rows per first round match (for spacing)
  return firstRoundMatches * 2;
}

/**
 * Get round name based on matches remaining
 * @param {number} matchesInRound - Number of matches in this round
 * @param {number} roundNumber - 1-based round number
 * @returns {string} Human-readable round name
 */
export function getRoundName(matchesInRound, roundNumber) {
  if (matchesInRound === 1) return 'Final';
  if (matchesInRound === 2) return 'Semifinals';
  if (matchesInRound === 4) return 'Quarterfinals';
  if (matchesInRound === 8) return 'Round of 16';
  if (matchesInRound === 16) return 'Round of 32';
  if (matchesInRound === 32) return 'Round of 64';
  return `Round ${roundNumber}`;
}

/**
 * Determine the display state of a player in a match
 * @param {Object} match - Match object
 * @param {'top'|'bottom'} position - Player position
 * @returns {'normal'|'winner'|'loser'|'tbd'} Display state
 */
export function getPlayerState(match, position) {
  if (!match) return 'tbd';
  if (match.status !== 'COMPLETED') return 'tbd';

  const winnerPosition = match.matchResult?.winner;
  if (!winnerPosition) return 'tbd';

  const isWinner =
    (position === 'top' && winnerPosition === 'PLAYER1') ||
    (position === 'bottom' && winnerPosition === 'PLAYER2');

  return isWinner ? 'winner' : 'loser';
}

/**
 * Format match score for display
 * @param {Object} matchResult - Match result object
 * @returns {string} Formatted score string
 */
export function formatScore(matchResult) {
  if (!matchResult) return '-';
  if (matchResult.finalScore) return matchResult.finalScore;

  if (matchResult.sets && matchResult.sets.length > 0) {
    return matchResult.sets
      .map(set => {
        const tiebreak = set.tiebreakScore ? `(${set.tiebreakScore})` : '';
        return `${set.player1Score}:${set.player2Score}${tiebreak}`;
      })
      .join(' ');
  }

  return '-';
}

/**
 * Check if a match is a first-round BYE (FR-007)
 * @param {Object} match - Match object
 * @returns {boolean} True if first-round BYE
 */
export function isFirstRoundBye(match) {
  return match.roundNumber === 1 && (match.isBye === true || match.status === 'BYE');
}

/**
 * Check if tournament has first-round BYEs by comparing actual matches to bracket size
 * For an 11-player tournament in a 16-bracket, there are only 3 preliminary matches
 * but the bracket should display 8 Round 1 positions (some will be BYEs)
 *
 * @param {Array} matches - Array of match objects
 * @returns {boolean} True if first-round BYEs exist
 */
export function hasFirstRoundByes(matches) {
  if (!matches || matches.length === 0) return false;

  // First check if any matches are explicitly marked as BYE
  const hasExplicitByes = matches.some(isFirstRoundBye);
  if (hasExplicitByes) return true;

  // Calculate expected Round 1 matches based on bracket size
  // Find the first round
  const round1Matches = matches.filter(m => m.roundNumber === 1);
  if (round1Matches.length === 0) return false;

  // Find total number of matches to determine bracket size
  // Bracket size = next power of 2 >= participant count
  // For a complete bracket: Round 1 should have bracketSize/2 matches
  const rounds = Math.max(...matches.map(m => m.roundNumber));

  // Expected bracket size is 2^rounds
  const bracketSize = Math.pow(2, rounds);
  const expectedRound1Matches = bracketSize / 2;

  // If actual Round 1 matches < expected, then BYEs exist
  return round1Matches.length < expectedRound1Matches;
}

/**
 * Find the current user's relevant matches in the bracket (FR-013)
 * @param {Array} matches - All matches in bracket
 * @param {string} playerProfileId - Current user's player profile ID
 * @returns {Object} MyMatchContext with current, previous, opponent matches
 */
export function findMyMatch(matches, playerProfileId) {
  if (!playerProfileId || !matches || matches.length === 0) {
    return {
      playerProfileId: null,
      currentMatch: null,
      previousMatch: null,
      opponentPreviousMatch: null,
      isParticipant: false,
      tournamentStatus: 'SPECTATOR',
    };
  }

  // Find all matches where user is a participant
  const myMatches = matches.filter(m =>
    m.player1?.id === playerProfileId ||
    m.player2?.id === playerProfileId ||
    m.pair1?.player1?.id === playerProfileId ||
    m.pair1?.player2?.id === playerProfileId ||
    m.pair2?.player1?.id === playerProfileId ||
    m.pair2?.player2?.id === playerProfileId
  );

  if (myMatches.length === 0) {
    return {
      playerProfileId,
      currentMatch: null,
      previousMatch: null,
      opponentPreviousMatch: null,
      isParticipant: false,
      tournamentStatus: 'SPECTATOR',
    };
  }

  // Sort by round number
  const sortedMatches = [...myMatches].sort((a, b) => a.roundNumber - b.roundNumber);

  // Find next unplayed match
  const nextMatch = sortedMatches.find(m =>
    m.status === 'SCHEDULED' || m.status === 'IN_PROGRESS'
  );

  // Find completed matches
  const completedMatches = sortedMatches.filter(m => m.status === 'COMPLETED');
  const previousMatch = completedMatches[completedMatches.length - 1] || null;

  // Determine tournament status
  let tournamentStatus = 'SPECTATOR';
  if (myMatches.length > 0) {
    if (nextMatch) {
      tournamentStatus = 'UPCOMING';
    } else if (previousMatch) {
      // Check if user won their last match
      const isPlayer1 = previousMatch.player1?.id === playerProfileId ||
        previousMatch.pair1?.player1?.id === playerProfileId ||
        previousMatch.pair1?.player2?.id === playerProfileId;
      const winner = previousMatch.matchResult?.winner;

      if ((isPlayer1 && winner === 'PLAYER1') || (!isPlayer1 && winner === 'PLAYER2')) {
        // Won last match - check if it was the final
        const finalMatch = sortedMatches[sortedMatches.length - 1];
        tournamentStatus = finalMatch?.roundNumber === previousMatch.roundNumber &&
          previousMatch.status === 'COMPLETED' ? 'WINNER' : 'UPCOMING';
      } else {
        tournamentStatus = 'ELIMINATED';
      }
    }
  }

  // Find opponent's previous match (if we have a next match)
  let opponentPreviousMatch = null;
  if (nextMatch) {
    // Determine who the opponent is
    const isPlayer1 = nextMatch.player1?.id === playerProfileId ||
      nextMatch.pair1?.player1?.id === playerProfileId ||
      nextMatch.pair1?.player2?.id === playerProfileId;

    const opponentId = isPlayer1
      ? (nextMatch.player2?.id || nextMatch.pair2?.player1?.id)
      : (nextMatch.player1?.id || nextMatch.pair1?.player1?.id);

    if (opponentId) {
      // Find opponent's most recent completed match
      const opponentMatches = matches.filter(m =>
        (m.player1?.id === opponentId || m.player2?.id === opponentId ||
          m.pair1?.player1?.id === opponentId || m.pair1?.player2?.id === opponentId ||
          m.pair2?.player1?.id === opponentId || m.pair2?.player2?.id === opponentId) &&
        m.status === 'COMPLETED'
      );
      opponentPreviousMatch = opponentMatches[opponentMatches.length - 1] || null;
    }
  }

  return {
    playerProfileId,
    currentMatch: nextMatch || previousMatch,
    previousMatch,
    opponentPreviousMatch,
    isParticipant: true,
    tournamentStatus,
  };
}

/**
 * Get match IDs to highlight for "My Match" feature
 * @param {Object} myMatchContext - Result from findMyMatch
 * @returns {string[]} Array of match IDs to highlight
 */
export function getHighlightedMatchIds(myMatchContext) {
  const ids = [];

  if (myMatchContext.currentMatch) {
    ids.push(myMatchContext.currentMatch.id);
  }
  if (myMatchContext.previousMatch && myMatchContext.previousMatch.id !== myMatchContext.currentMatch?.id) {
    ids.push(myMatchContext.previousMatch.id);
  }
  if (myMatchContext.opponentPreviousMatch) {
    ids.push(myMatchContext.opponentPreviousMatch.id);
  }

  return ids;
}

/**
 * Check if the logged-in player is a participant in a match.
 * Works for both singles (player1/player2) and doubles (pair1/pair2 members).
 * Used by KnockoutBracket to gate the match click handler.
 *
 * @param {Object} match - Match object from useMatches SWR hook
 * @param {string|null} currentPlayerId - Logged-in user's playerProfile.id (null if no profile)
 * @returns {boolean}
 */
export function isMatchParticipant(match, currentPlayerId) {
  if (!currentPlayerId || !match) return false;

  // Singles: direct player match
  if (match.player1?.id === currentPlayerId || match.player2?.id === currentPlayerId) {
    return true;
  }

  // Doubles: check pair members
  if (
    match.pair1?.player1?.id === currentPlayerId ||
    match.pair1?.player2?.id === currentPlayerId ||
    match.pair2?.player1?.id === currentPlayerId ||
    match.pair2?.player2?.id === currentPlayerId
  ) {
    return true;
  }

  return false;
}
