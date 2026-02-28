// T004: KnockoutBracket Component - Enhanced with new architecture
// T078-T084: CSS Grid layout with horizontal scroll
// T030: Integrated with zoom/pan navigation
// FR-001: Triangular bracket layout (first round left, final right)
// FR-002: Match positioned vertically between predecessor matches
// FR-010, FR-011, FR-012: Zoom, pan, and reset navigation

import { useState, useRef, useMemo } from 'react';
import { Alert, Spinner, Badge } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { useMatches } from '../services/tournamentViewService';
import BracketMatch from './BracketMatch';
import BracketControls from './BracketControls';
import BracketMyMatch from './BracketMyMatch';
import MatchResultModal from './MatchResultModal';
import { useBracketNavigation } from '../hooks/useBracketNavigation';
import { mergeColors } from '../config/bracketColors';
import {
  hasFirstRoundByes,
  findMyMatch,
  getHighlightedMatchIds,
  isMatchParticipant
} from '../utils/bracketUtils';
import { useAuth } from '../utils/AuthContext';
import './KnockoutBracket.css';

/**
 * T079: BracketRound - Displays all matches in a single round
 * Uses flexbox layout with vertical spacing for tournament bracket display
 */
const BracketRound = ({
  round,
  matches,
  colors,
  isDoubles,
  highlightedMatchIds = [],
  onMatchClick,
  showFirstRoundByes
}) => {
  // Count actual matches (non-BYE) for display
  const actualMatchCount = matches.filter(m => !m.isBye && m.status !== 'BYE').length;

  return (
    <div className="bracket-round" data-round={round.roundNumber}>
      <div className="round-header">
        <h6>{round.name || `Round ${round.roundNumber}`}</h6>
        <small className="text-muted">{actualMatchCount} matches</small>
      </div>
      <div className="round-matches">
        {matches.map((match, index) => {
          const isHighlighted = highlightedMatchIds.includes(match?.id);
          const isBye = match?.isBye || match?.status === 'BYE';
          // Hide BYEs visually but keep space (only in round 1 when showFirstRoundByes is false)
          const hideBye = isBye && round.roundNumber === 1 && !showFirstRoundByes;

          return (
            <div
              key={match?.id || index}
              className={`match-wrapper ${isHighlighted ? 'highlighted' : ''} ${hideBye ? 'bye-hidden' : ''}`}
              data-match-number={match.matchNumber || index + 1}
            >
              <BracketMatch
                match={match}
                colors={colors}
                isHighlighted={isHighlighted}
                isDoubles={isDoubles}
                onClick={onMatchClick}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

BracketRound.propTypes = {
  round: PropTypes.shape({
    id: PropTypes.string,
    roundNumber: PropTypes.number.isRequired,
    name: PropTypes.string
  }).isRequired,
  matches: PropTypes.array.isRequired,
  colors: PropTypes.object,
  isDoubles: PropTypes.bool,
  highlightedMatchIds: PropTypes.arrayOf(PropTypes.string),
  onMatchClick: PropTypes.func,
  showFirstRoundByes: PropTypes.bool
};

/**
 * T078-T084, T030: KnockoutBracket - Main bracket component with CSS Grid layout
 * Enhanced with zoom/pan support, BYE toggle, and My Match navigation
 *
 * @param {string} tournamentId - Tournament UUID
 * @param {Object} bracket - Bracket object with id, name, and type
 * @param {Array} rounds - Array of round objects
 * @param {string} currentUserPlayerId - Current user's player profile ID (optional)
 * @param {Function} onMatchClick - Click handler for matches (optional)
 * @param {number} initialScale - Initial zoom scale (optional, default 1.0)
 * @param {boolean} showByes - Initial BYE visibility (optional, default false)
 * @param {Object} colors - Custom color configuration (optional)
 * @param {boolean} isDoubles - Whether this is a doubles tournament (optional)
 * @param {string} className - Additional CSS class (optional)
 */
const KnockoutBracket = ({
  tournamentId,
  bracket,
  rounds,
  currentUserPlayerId,
  onMatchClick,
  scoringRules,
  tournamentStatus,
  initialScale = 1.0,
  showByes: initialShowByes = false,
  colors: customColors,
  isDoubles = false,
  className = ''
}) => {
  // State
  const [showBracket, setShowBracket] = useState(false);
  const [showFirstRoundByes, setShowFirstRoundByes] = useState(initialShowByes);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedMatchIsParticipant, setSelectedMatchIsParticipant] = useState(false);

  // Refs
  const containerRef = useRef(null);
  const viewportRef = useRef(null);

  // Navigation hook (T030)
  const navigation = useBracketNavigation({
    initialScale,
    containerRef: viewportRef
  });

  // Auth context — used for role check and participant gating
  const { user } = useAuth();
  const isOrganizer = user?.role === 'ADMIN' || user?.role === 'ORGANIZER';

  // Merge colors with defaults
  const colors = useMemo(() => mergeColors(customColors), [customColors]);

  // T088-T089: Lazy load matches only when bracket is expanded
  const { matches, isLoading, isError, mutate } = useMatches(
    tournamentId,
    { bracketId: bracket.id },
    showBracket
  );

  // Check if tournament has first-round BYEs
  const hasByes = useMemo(() => {
    if (!matches || matches.length === 0 || !rounds || rounds.length === 0) return false;

    // Enrich matches with roundNumber for BYE detection
    const enrichedMatches = matches.map(match => {
      const round = rounds.find(r => r.id === match.roundId);
      return {
        ...match,
        roundNumber: round?.roundNumber || 0
      };
    });

    return hasFirstRoundByes(enrichedMatches);
  }, [matches, rounds]);

  // My Match context (for User Story 4)
  const myMatchContext = useMemo(() => {
    if (!currentUserPlayerId || !matches || !rounds || rounds.length === 0) return null;

    // Enrich matches with roundNumber for My Match feature
    const enrichedMatches = matches.map(match => {
      const round = rounds.find(r => r.id === match.roundId);
      return {
        ...match,
        roundNumber: round?.roundNumber || 0
      };
    });

    return findMyMatch(enrichedMatches, currentUserPlayerId);
  }, [matches, rounds, currentUserPlayerId]);

  // Compute highlighted matches from My Match context
  const highlightedMatchIds = useMemo(() => {
    if (myMatchContext && myMatchContext.isParticipant) {
      return getHighlightedMatchIds(myMatchContext);
    }
    return [];
  }, [myMatchContext]);

  // Organize matches by round - backend provides all matches including BYEs
  const matchesByRound = useMemo(() => {
    if (!matches || matches.length === 0) return [];

    // Enrich matches with roundNumber from rounds data
    const enrichedMatches = matches.map(match => {
      const round = rounds.find(r => r.id === match.roundId);
      return {
        ...match,
        roundNumber: round?.roundNumber || 0
      };
    });

    // Group matches by round and sort by matchNumber (bracket position)
    return rounds.map(round => {
      const roundMatches = enrichedMatches
        .filter(m => m.roundId === round.id)
        .sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0));

      return { round, matches: roundMatches };
    });
  }, [rounds, matches]);

  // Match click handler — gates access by role and participation
  const handleMatchClick = (match) => {
    if (!user) return; // unauthenticated — no modal
    if (match?.isBye || match?.status === 'BYE') return; // BYE slots are not clickable
    // Read-only for non-organizers when tournament is completed (LIFE-03)
    if (!isOrganizer && tournamentStatus === 'COMPLETED') return;
    const participant = isMatchParticipant(match, user.playerId);
    if (!isOrganizer && !participant) return; // non-participant player — no modal
    setSelectedMatch(match);
    setSelectedMatchIsParticipant(participant);
    // Forward to external handler if provided (backward compatibility with Feature 011)
    if (onMatchClick) onMatchClick(match);
  };

  // Toggle BYE visibility
  const handleToggleByes = () => {
    setShowFirstRoundByes(prev => !prev);
  };

  // Wrapper classes
  const wrapperClasses = [
    'knockout-bracket',
    className
  ].filter(Boolean).join(' ');

  // Viewport classes
  const viewportClasses = [
    'bracket-viewport',
    navigation.isDragging && 'dragging',
    navigation.scale !== 1 && 'zoomed'
  ].filter(Boolean).join(' ');

  const viewportContentClasses = [
    'bracket-viewport-content',
    navigation.isDragging && 'dragging'
  ].filter(Boolean).join(' ');

  return (
    <div className={wrapperClasses}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5>{bracket.name || bracket.bracketType || 'Main Bracket'}</h5>
        <div className="d-flex gap-2">
          {/* Expand/Collapse button */}
          <button
            className="btn btn-outline-primary btn-sm"
            onClick={() => setShowBracket(!showBracket)}
          >
            {showBracket ? '\u25BC Collapse' : '\u25B6 Expand'} Bracket
          </button>
        </div>
      </div>

      {showBracket && (
        <>
          {isLoading && (
            <div className="text-center py-4">
              <Spinner animation="border" />
              <p className="text-muted mt-2">Loading bracket...</p>
            </div>
          )}

          {isError && (
            <Alert variant="danger">
              Failed to load bracket data. Please try again.
            </Alert>
          )}

          {matches && matches.length > 0 && (
            <div className="bracket-wrapper" ref={containerRef}>
              {/* Controls bar (T030) */}
              <div className="bracket-controls-wrapper">
                <BracketControls
                  scale={navigation.scale}
                  onZoomIn={navigation.zoomIn}
                  onZoomOut={navigation.zoomOut}
                  onReset={navigation.reset}
                  onToggleByes={handleToggleByes}
                  showByes={showFirstRoundByes}
                  hasByes={hasByes}
                  canZoomIn={navigation.canZoomIn}
                  canZoomOut={navigation.canZoomOut}
                  colors={colors}
                />

                {/* My Match navigation (T047) */}
                <BracketMyMatch
                  context={myMatchContext}
                  onNavigate={(matchIds) => {
                    if (matchIds.length > 0) {
                      navigation.centerOnElement(matchIds[0]);
                    }
                  }}
                  colors={colors}
                  className="ms-2"
                />
              </div>

              {/* Zoomable/pannable viewport (T030) */}
              <div
                ref={viewportRef}
                className={viewportClasses}
                onWheel={navigation.handleWheel}
                onMouseDown={navigation.handleMouseDown}
                onMouseMove={navigation.handleMouseMove}
                onMouseUp={navigation.handleMouseUp}
                onTouchStart={navigation.handleTouchStart}
                onTouchMove={navigation.handleTouchMove}
                onTouchEnd={navigation.handleTouchEnd}
              >
                <div
                  className={viewportContentClasses}
                  style={navigation.containerStyle}
                >
                  <div className="bracket-container">
                    <div className="bracket-grid">
                      {matchesByRound.map(({ round, matches: roundMatches }) => (
                        <BracketRound
                          key={round.id}
                          round={round}
                          matches={roundMatches}
                          colors={colors}
                          isDoubles={isDoubles}
                          highlightedMatchIds={highlightedMatchIds}
                          onMatchClick={handleMatchClick}
                          showFirstRoundByes={showFirstRoundByes}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Navigation hint */}
                <div className="bracket-nav-hint">
                  Scroll to zoom, drag to pan
                </div>
              </div>

              {/* Legend */}
              <div className="mt-3 d-flex gap-3 flex-wrap align-items-center">
                <small className="text-muted">
                  <Badge bg="secondary" className="me-1">{'\u23F0'}</Badge> Scheduled
                </small>
                <small className="text-muted">
                  <Badge bg="primary" className="me-1">{'\u25B6'}</Badge> In Progress
                </small>
                <small className="text-muted">
                  <Badge bg="success" className="me-1">{'\u2713'}</Badge> Completed
                </small>
                <small className="text-muted">
                  <Badge bg="danger" className="me-1">{'\u2715'}</Badge> Cancelled
                </small>
                {hasByes && (
                  <small className="text-muted">
                    <Badge bg="warning" className="me-1">BYE</Badge> Automatic advance
                  </small>
                )}
              </div>
            </div>
          )}

          {matches && matches.length === 0 && (
            <Alert variant="info">
              No matches scheduled yet for this bracket.
            </Alert>
          )}
        </>
      )}

      {/* Match result modal — opens on click for participants and organizers */}
      <MatchResultModal
        match={selectedMatch}
        onClose={() => setSelectedMatch(null)}
        isOrganizer={isOrganizer}
        isParticipant={selectedMatchIsParticipant}
        scoringRules={scoringRules}
        mutate={mutate}
      />
    </div>
  );
};

KnockoutBracket.propTypes = {
  tournamentId: PropTypes.string.isRequired,
  bracket: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string,
    bracketType: PropTypes.string
  }).isRequired,
  rounds: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    roundNumber: PropTypes.number.isRequired,
    name: PropTypes.string
  })).isRequired,
  currentUserPlayerId: PropTypes.string,
  onMatchClick: PropTypes.func,
  scoringRules: PropTypes.object,
  tournamentStatus: PropTypes.string,
  initialScale: PropTypes.number,
  showByes: PropTypes.bool,
  colors: PropTypes.object,
  isDoubles: PropTypes.bool,
  className: PropTypes.string
};

export default KnockoutBracket;
