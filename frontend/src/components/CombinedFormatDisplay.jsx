// T087: Combined Format Display Component - Orchestrates Group Stage + Knockout Phase
import { Alert, Badge, Button, Accordion, ProgressBar } from 'react-bootstrap';
import GroupStandingsTable from './GroupStandingsTable';
import KnockoutBracket from './KnockoutBracket';

/**
 * CombinedFormatDisplay - Displays both group stage and knockout phase
 * Used for COMBINED format tournaments
 *
 * @param {string} tournamentId - Tournament UUID
 * @param {Object} tournament - Full tournament object (status, category, defaultScoringRules)
 * @param {Array} groups - Array of group objects from format structure
 * @param {Array} brackets - Array of bracket objects from format structure
 * @param {Array} rounds - Array of round objects from format structure
 * @param {boolean} isOrganizer - Whether current user is an organizer/admin
 * @param {string|null} currentUserPlayerId - Current user's player profile ID (for My Match)
 * @param {Object|null} scoringRules - Scoring rules { formatType, winningSets, winningTiebreaks }
 * @param {boolean} groupsComplete - Whether all group matches are COMPLETED or CANCELLED
 * @param {Array|null} allMatches - All matches for per-group progress bar computation
 */
const CombinedFormatDisplay = ({
  tournamentId,
  tournament,
  groups,
  brackets,
  rounds,
  isOrganizer = false,
  currentUserPlayerId = null,
  scoringRules = null,
  groupsComplete = false,
  allMatches = null,
}) => {
  // Separate rounds by phase (knockout rounds for bracket display)
  const knockoutRounds = rounds?.filter(r => r.phase === 'KNOCKOUT') || [];

  // Compute completion percentage for a single group
  const computeGroupCompletionPct = (matchesArray, groupId) => {
    if (!matchesArray) return 0;
    const groupMatches = matchesArray.filter(m => m.groupId === groupId);
    if (groupMatches.length === 0) return 0;
    const completed = groupMatches.filter(m => m.status === 'COMPLETED' || m.status === 'CANCELLED').length;
    return Math.round((completed / groupMatches.length) * 100);
  };

  return (
    <div>
      {/* Group completion banner — organizer sees this when all group matches done and no bracket */}
      {isOrganizer && groupsComplete && brackets && brackets.length === 0 && (
        <Alert variant="success" className="d-flex justify-content-between align-items-center mb-4">
          <span><strong>Group stage complete</strong> — Ready to generate knockout bracket</span>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              // TODO: Phase 30 — wire to advancement/bracket generation flow
              window.scrollTo(0, 0);
            }}
          >
            Generate Knockout Bracket
          </Button>
        </Alert>
      )}

      {/* Group Stage Section */}
      <div className="mb-5">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">Group Stage</h6>
          {groups && <Badge bg="primary">{groups.length} groups</Badge>}
        </div>

        {groups && groups.length > 0 ? (
          <Accordion defaultActiveKey={tournament?.status === 'IN_PROGRESS' ? groups[0]?.id : null}>
            {groups.map(group => (
              <Accordion.Item key={group.id} eventKey={group.id}>
                <Accordion.Header>
                  <div style={{ flexGrow: 1, marginRight: '1rem' }}>
                    <div className="d-flex align-items-center gap-2">
                      <span className="fw-bold">{group.name || `Group ${group.groupNumber}`}</span>
                      <span className="badge bg-secondary">
                        {group.pairs?.length > 0
                          ? `${group.pairs.length} pairs`
                          : `${group.players?.length || 0} players`}
                      </span>
                    </div>
                    <ProgressBar
                      now={computeGroupCompletionPct(allMatches, group.id)}
                      variant="success"
                      style={{ height: '4px', marginTop: '4px' }}
                    />
                  </div>
                </Accordion.Header>
                <Accordion.Body>
                  <GroupStandingsTable
                    tournamentId={tournamentId}
                    group={group}
                    isOrganizer={isOrganizer}
                    currentUserPlayerId={currentUserPlayerId}
                    scoringRules={scoringRules}
                    tournamentStatus={tournament?.status}
                  />
                </Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        ) : (
          <Alert variant="info">Group stage not yet configured.</Alert>
        )}
      </div>

      {/* Knockout Phase Section */}
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">Knockout Phase</h6>
          {brackets && <Badge bg="primary">{brackets.length} bracket(s)</Badge>}
        </div>

        {brackets && brackets.length > 0 ? (
          <div className="d-flex flex-column gap-4">
            {brackets.map(bracket => {
              const bracketRounds = knockoutRounds.filter(r => r.bracketId === bracket.id);
              return (
                <KnockoutBracket
                  key={bracket.id}
                  tournamentId={tournamentId}
                  bracket={bracket}
                  rounds={bracketRounds}
                  currentUserPlayerId={currentUserPlayerId}
                  tournamentStatus={tournament?.status}
                  isDoubles={tournament?.category?.type === 'DOUBLES'}
                  scoringRules={scoringRules}
                />
              );
            })}
          </div>
        ) : (
          <Alert variant="info">
            Knockout bracket will appear after group stage completes.
          </Alert>
        )}
      </div>
    </div>
  );
};

export default CombinedFormatDisplay;
