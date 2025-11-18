// T087: Combined Format Display Component - Orchestrates Group Stage + Knockout Phase
import { Alert, Badge } from 'react-bootstrap';
import GroupStandingsTable from './GroupStandingsTable';
import KnockoutBracket from './KnockoutBracket';
import ExpandableSection from './ExpandableSection';

/**
 * CombinedFormatDisplay - Displays both group stage and knockout phase
 * Used for COMBINED format tournaments
 *
 * @param {string} tournamentId - Tournament UUID
 * @param {Array} groups - Array of group objects from format structure
 * @param {Array} brackets - Array of bracket objects from format structure
 * @param {Array} rounds - Array of round objects from format structure
 */
const CombinedFormatDisplay = ({ tournamentId, groups, brackets, rounds }) => {
  // Separate rounds by phase (group rounds vs knockout rounds)
  const groupRounds = rounds?.filter(r => r.phase === 'GROUP') || [];
  const knockoutRounds = rounds?.filter(r => r.phase === 'KNOCKOUT') || [];

  return (
    <div>
      <h5 className="mb-4">Combined Format: Group Stage + Knockout</h5>

      {/* Group Stage Section */}
      <div className="mb-5">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">🏁 Group Stage</h6>
          {groups && <Badge bg="primary">{groups.length} groups</Badge>}
        </div>

        {groups && groups.length > 0 ? (
          <div className="d-flex flex-column gap-4">
            {groups.map(group => (
              <ExpandableSection
                key={group.id}
                title={group.name || `Group ${group.groupNumber}`}
                badge={
                  <Badge bg="secondary">
                    {group.players?.length || 0} players
                  </Badge>
                }
                defaultExpanded={false}
              >
                <GroupStandingsTable
                  tournamentId={tournamentId}
                  group={group}
                />
              </ExpandableSection>
            ))}
          </div>
        ) : (
          <Alert variant="info">
            Group stage not yet configured.
          </Alert>
        )}
      </div>

      {/* Knockout Phase Section */}
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">🏆 Knockout Phase</h6>
          {brackets && <Badge bg="primary">{brackets.length} bracket(s)</Badge>}
        </div>

        {brackets && brackets.length > 0 ? (
          <div className="d-flex flex-column gap-4">
            {brackets.map(bracket => {
              // Get rounds for this bracket
              const bracketRounds = knockoutRounds.filter(r => r.bracketId === bracket.id);

              return (
                <ExpandableSection
                  key={bracket.id}
                  title={bracket.name || bracket.bracketType || 'Main Bracket'}
                  badge={
                    <Badge bg="secondary">
                      {bracketRounds.length} rounds
                    </Badge>
                  }
                  defaultExpanded={false}
                >
                  <KnockoutBracket
                    tournamentId={tournamentId}
                    bracket={bracket}
                    rounds={bracketRounds}
                  />
                </ExpandableSection>
              );
            })}
          </div>
        ) : (
          <Alert variant="info">
            Knockout phase not yet configured. The top players from each group will advance to the knockout phase.
          </Alert>
        )}
      </div>

      {/* Format Information */}
      <Alert variant="light" className="mt-4">
        <strong>About Combined Format:</strong> This tournament uses a combined format where players compete in a group stage first,
        followed by a knockout phase for the top performers from each group.
      </Alert>
    </div>
  );
};

export default CombinedFormatDisplay;
