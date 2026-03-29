// Phase 30.1: CrossTable — N x N head-to-head match results grid
// Displays match results in a matrix format between group entities (singles players or doubles pairs)
import { useMemo } from 'react';
import './CrossTable.css';

/**
 * Get initials for a single player name.
 * "Alice Liddell" → "AL", "Madonna" → "MA", "" → "?"
 */
function getInitials(name) {
  if (!name) return '?';
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

/**
 * Compute initials for an entity name (handles doubles "A / B" format).
 * Doubles: "Alice L / Bob M" → "AL/BM"
 * Singles: "Alice Liddell" → "AL"
 */
function computeInitials(name) {
  if (!name) return '?';
  if (name.includes(' / ')) {
    const players = name.split(' / ');
    return players.map(p => getInitials(p.trim())).join('/');
  }
  return getInitials(name);
}

/**
 * Build an initials map for all entities with collision detection.
 * Returns a Map<entityId, initialsString>.
 * Collisions: "AL", "AL2", "AL3", ...
 */
function buildInitialsMap(entities) {
  const seen = {}; // raw initials → count
  const result = new Map();
  for (const entity of entities) {
    const raw = computeInitials(entity.name);
    if (!seen[raw]) {
      seen[raw] = 1;
      result.set(entity.id, raw);
    } else {
      seen[raw] += 1;
      result.set(entity.id, `${raw}${seen[raw]}`);
    }
  }
  return result;
}

/**
 * Parse match result (may be a string or an object).
 * Returns the parsed result object, or null if not parseable.
 */
function parseResult(match) {
  if (!match?.result) return null;
  if (typeof match.result === 'string') {
    try {
      return JSON.parse(match.result);
    } catch {
      return null;
    }
  }
  return match.result;
}

/**
 * Get the score string for a cell from the row entity's perspective.
 * - BIG_TIEBREAK / single-set: game score from first set (e.g., "6-4")
 * - Multi-set: set count (e.g., "2-1")
 * Returns null if match not completed.
 */
function getCellScore(match, rowEntityId, scoringRules) {
  if (!match || match.status !== 'COMPLETED') return null;
  const result = parseResult(match);
  if (!result) return null;

  const p1Id = match.player1?.id || match.pair1?.id;
  const isRowPlayer1 = (rowEntityId === p1Id);

  // BIG_TIEBREAK or single-set format: show game score from first set
  const isSingleSet = scoringRules?.formatType === 'BIG_TIEBREAK'
    || scoringRules?.winningSets === 1;

  if (isSingleSet) {
    const set = result.sets?.[0];
    if (!set) return null;
    const myScore = isRowPlayer1 ? set.player1Score : set.player2Score;
    const oppScore = isRowPlayer1 ? set.player2Score : set.player1Score;
    return `${myScore}-${oppScore}`;
  }

  // Multi-set: count sets won from row player's perspective
  const sets = result.sets || [];
  let myWins = 0;
  let oppWins = 0;
  for (const s of sets) {
    const myScore = isRowPlayer1 ? s.player1Score : s.player2Score;
    const oppScore = isRowPlayer1 ? s.player2Score : s.player1Score;
    if (myScore > oppScore) {
      myWins++;
    } else {
      oppWins++;
    }
  }
  return `${myWins}-${oppWins}`;
}

/**
 * Determine win/loss state for a cell from the row entity's perspective.
 * Returns 'win', 'loss', or null (not completed / no result).
 */
function getCellWinState(match, rowEntityId) {
  if (!match || match.status !== 'COMPLETED') return null;
  const result = parseResult(match);
  if (!result?.winner) return null;

  const p1Id = match.player1?.id || match.pair1?.id;
  const isRowPlayer1 = (rowEntityId === p1Id);

  if (result.winner === 'PLAYER1') return isRowPlayer1 ? 'win' : 'loss';
  if (result.winner === 'PLAYER2') return isRowPlayer1 ? 'loss' : 'win';
  return null;
}

/**
 * CrossTable — N x N matrix grid of head-to-head match results.
 *
 * @param {Array}       entities          - Array of { id, name } — group players or pairs
 * @param {Array}       matches           - Array of match objects from useMatches()
 * @param {boolean}     isDoubles         - true if pair-based IDs, false for player-based
 * @param {Object|null} scoringRules      - { formatType, winningSets } — determines score display format
 * @param {string|null} highlightedMatchId - Currently highlighted match ID (from parent state)
 * @param {Function}    onCellHover       - (matchId) => void — called on mouseenter
 * @param {Function}    onCellLeave       - () => void — called on mouseleave
 * @param {Function}    onCellClick       - (match, rowEntity, colEntity) => void — called on cell click
 */
const CrossTable = ({
  entities = [],
  matches = [],
  isDoubles = false,
  scoringRules = null,
  highlightedMatchId = null,
  onCellHover,
  onCellLeave,
  onCellClick
}) => {
  // Build O(1) match lookup: matchLookup[rowId][colId] = match
  const matchLookup = useMemo(() => {
    const map = {};
    if (!matches) return map;
    for (const match of matches) {
      const id1 = isDoubles ? match.pair1?.id : match.player1?.id;
      const id2 = isDoubles ? match.pair2?.id : match.player2?.id;
      if (!id1 || !id2) continue;
      if (!map[id1]) map[id1] = {};
      if (!map[id2]) map[id2] = {};
      map[id1][id2] = match;
      map[id2][id1] = match;
    }
    return map;
  }, [matches, isDoubles]);

  // Compute initials with collision detection
  const initialsMap = useMemo(() => buildInitialsMap(entities), [entities]);

  if (!entities || entities.length === 0) {
    return null;
  }

  return (
    <div className="table-responsive">
      <table className="table table-bordered cross-table">
        <caption className="visually-hidden">
          Head-to-head match results grid. Rows are attacking player, columns are defending player.
        </caption>
        <thead className="table-light">
          <tr>
            {/* Top-left corner — empty */}
            <th />
            {entities.map(colEntity => (
              <th
                key={colEntity.id}
                className="text-center text-muted fw-bold cross-table-header"
                title={colEntity.name}
              >
                {initialsMap.get(colEntity.id)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entities.map(rowEntity => (
            <tr key={rowEntity.id}>
              {/* Row label: full entity name */}
              <td><strong>{rowEntity.name}</strong></td>
              {entities.map(colEntity => {
                // Diagonal cell
                if (rowEntity.id === colEntity.id) {
                  return (
                    <td
                      key={colEntity.id}
                      className="cross-table-diagonal"
                      aria-hidden="true"
                      style={{ cursor: 'default' }}
                    />
                  );
                }

                // Non-diagonal: look up the match
                const match = matchLookup[rowEntity.id]?.[colEntity.id];
                const score = getCellScore(match, rowEntity.id, scoringRules);
                const winState = getCellWinState(match, rowEntity.id);

                // Build className
                let cellClass = 'cross-table-cell text-center';
                if (winState === 'win') {
                  cellClass += ' text-success fw-bold';
                } else {
                  // loss, unplayed, or in-progress — all use muted
                  cellClass += ' text-muted';
                }
                if (match && highlightedMatchId === match.id) {
                  cellClass += ' cross-highlight';
                }

                // Build aria-label
                let ariaLabel;
                if (score !== null && winState !== null) {
                  ariaLabel = `${rowEntity.name} vs ${colEntity.name}: ${score}, ${winState}`;
                } else {
                  ariaLabel = `${rowEntity.name} vs ${colEntity.name}: not played`;
                }

                const handleClick = () => {
                  if (onCellClick) onCellClick(match, rowEntity, colEntity);
                };

                const handleKeyDown = (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (onCellClick) onCellClick(match, rowEntity, colEntity);
                  }
                };

                const handleMouseEnter = () => {
                  if (match && onCellHover) onCellHover(match.id);
                };

                const handleMouseLeave = () => {
                  if (onCellLeave) onCellLeave();
                };

                return (
                  <td
                    key={colEntity.id}
                    className={cellClass}
                    style={{ cursor: 'pointer' }}
                    tabIndex={0}
                    aria-label={ariaLabel}
                    onClick={handleClick}
                    onKeyDown={handleKeyDown}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    {/* Score for completed matches, en-dash for unplayed */}
                    {score !== null ? score : '\u2013'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CrossTable;
