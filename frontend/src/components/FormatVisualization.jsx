// T072, T088-T091: Format Visualization Wrapper - Selects correct visualization with lazy loading
import { useState } from 'react';
import { Card, Button, Collapse, Alert, Spinner } from 'react-bootstrap';
import { useFormatStructure } from '../services/tournamentViewService';
import GroupStandingsTable from './GroupStandingsTable';
import KnockoutBracket from './KnockoutBracket';
import SwissRoundPairings from './SwissRoundPairings';
import CombinedFormatDisplay from './CombinedFormatDisplay';
import ExpandableSection from './ExpandableSection';

/**
 * FormatVisualization - Main wrapper that selects correct visualization based on formatType
 * T088: Implements lazy loading - only fetches format structure when section is expanded
 * T090-T091: Includes loading skeletons
 *
 * @param {Object} tournament - Tournament object with formatType
 */
const FormatVisualization = ({ tournament }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // T088: Lazy load format structure only when expanded
  const { structure, isLoading, isError } = useFormatStructure(
    tournament?.id,
    isExpanded
  );

  if (!tournament) return null;

  const formatType = tournament.formatType;

  // Format icons and labels
  const formatInfo = {
    GROUP: { icon: '👥', label: 'Group Stage Format' },
    KNOCKOUT: { icon: '🏆', label: 'Knockout Tournament' },
    SWISS: { icon: '♟️', label: 'Swiss System' },
    COMBINED: { icon: '🎯', label: 'Combined Format' }
  };

  const info = formatInfo[formatType] || { icon: '❓', label: 'Tournament Format' };

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <Card className="border-0 shadow-sm">
      <Card.Header className="bg-light">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <span className="me-2">{info.icon}</span>
            {info.label}
          </h5>
          <Button
            variant={isExpanded ? 'primary' : 'outline-primary'}
            size="sm"
            onClick={handleToggle}
            aria-expanded={isExpanded}
          >
            {isExpanded ? '▼ Collapse' : '▶ Expand'} Format
          </Button>
        </div>
      </Card.Header>

      <Collapse in={isExpanded}>
        <div>
          <Card.Body>
            {/* T090: Loading skeleton */}
            {isLoading && (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3 text-muted">Loading tournament structure...</p>
              </div>
            )}

            {/* Error state */}
            {isError && (
              <Alert variant="danger">
                <Alert.Heading>Failed to Load Format</Alert.Heading>
                <p>
                  Unable to load the tournament format structure. This could be because the
                  format has not been configured yet, or there was a connection error.
                </p>
                <hr />
                <div className="d-flex justify-content-end">
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => setIsExpanded(false)}
                  >
                    Close
                  </Button>
                </div>
              </Alert>
            )}

            {/* Render appropriate visualization based on format type */}
            {!isLoading && !isError && structure && (
              <>
                {formatType === 'GROUP' && (
                  <div className="d-flex flex-column gap-4">
                    {structure.groups?.map(group => (
                      <ExpandableSection
                        key={group.id}
                        title={group.name || `Group ${group.groupNumber}`}
                        badge={<span className="badge bg-secondary">{group.players?.length || 0} players</span>}
                        defaultExpanded={false}
                      >
                        <GroupStandingsTable
                          tournamentId={tournament.id}
                          group={group}
                        />
                      </ExpandableSection>
                    ))}
                    {(!structure.groups || structure.groups.length === 0) && (
                      <Alert variant="info">
                        Groups have not been created yet. Groups will be formed when the tournament starts.
                      </Alert>
                    )}
                  </div>
                )}

                {formatType === 'KNOCKOUT' && (
                  <div className="d-flex flex-column gap-4">
                    {structure.brackets?.map(bracket => {
                      const bracketRounds = structure.rounds?.filter(r => r.bracketId === bracket.id) || [];
                      return (
                        <KnockoutBracket
                          key={bracket.id}
                          tournamentId={tournament.id}
                          bracket={bracket}
                          rounds={bracketRounds}
                        />
                      );
                    })}
                    {(!structure.brackets || structure.brackets.length === 0) && (
                      <Alert variant="info">
                        Bracket has not been created yet. The bracket will be generated when the tournament starts.
                      </Alert>
                    )}
                  </div>
                )}

                {formatType === 'SWISS' && (
                  <SwissRoundPairings
                    tournamentId={tournament.id}
                    rounds={structure.rounds || []}
                    players={structure.players || []}
                  />
                )}

                {formatType === 'COMBINED' && (
                  <CombinedFormatDisplay
                    tournamentId={tournament.id}
                    groups={structure.groups || []}
                    brackets={structure.brackets || []}
                    rounds={structure.rounds || []}
                  />
                )}

                {!['GROUP', 'KNOCKOUT', 'SWISS', 'COMBINED'].includes(formatType) && (
                  <Alert variant="warning">
                    <strong>Unknown Format Type:</strong> {formatType}
                    <br />
                    This tournament uses a format type that is not yet supported for visualization.
                  </Alert>
                )}
              </>
            )}

            {/* Empty state - structure loaded but empty */}
            {!isLoading && !isError && !structure && (
              <Alert variant="info">
                <Alert.Heading>Format Not Configured</Alert.Heading>
                <p>
                  The tournament format structure has not been set up yet.
                  This will be available once the tournament organizer configures the format.
                </p>
              </Alert>
            )}
          </Card.Body>
        </div>
      </Collapse>
    </Card>
  );
};

export default FormatVisualization;
