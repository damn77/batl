// T072, T088-T091: Format Visualization Wrapper - Selects correct visualization with lazy loading
import { useState } from 'react';
import { Card, Button, Collapse, Alert, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
    GROUP: { icon: '👥', label: t('components.formatVisualization.formatTypes.group') },
    KNOCKOUT: { icon: '🏆', label: t('components.formatVisualization.formatTypes.knockout') },
    SWISS: { icon: '♟️', label: t('components.formatVisualization.formatTypes.swiss') },
    COMBINED: { icon: '🎯', label: t('components.formatVisualization.formatTypes.combined') }
  };

  const info = formatInfo[formatType] || { icon: '❓', label: t('components.formatVisualization.formatTypes.unknown') };

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
            {isExpanded ? `▼ ${t('components.formatVisualization.actions.collapse')}` : `▶ ${t('components.formatVisualization.actions.expand')}`}
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
                <p className="mt-3 text-muted">{t('components.formatVisualization.loading')}</p>
              </div>
            )}

            {/* Error state */}
            {isError && (
              <Alert variant="danger">
                <Alert.Heading>{t('components.formatVisualization.errorTitle')}</Alert.Heading>
                <p>
                  {t('components.formatVisualization.errorMessage')}
                </p>
                <hr />
                <div className="d-flex justify-content-end">
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => setIsExpanded(false)}
                  >
                    {t('components.formatVisualization.close')}
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
                        badge={<span className="badge bg-secondary">{t('components.formatVisualization.playersCount', { count: group.players?.length || 0 })}</span>}
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
                        {t('components.formatVisualization.emptyStates.noGroups')}
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
                        {t('components.formatVisualization.emptyStates.noBrackets')}
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
                    <strong>{t('components.formatVisualization.emptyStates.unknownFormat')}</strong> {formatType}
                    <br />
                    {t('components.formatVisualization.emptyStates.unknownFormatMessage')}
                  </Alert>
                )}
              </>
            )}

            {/* Empty state - structure loaded but empty */}
            {!isLoading && !isError && !structure && (
              <Alert variant="info">
                <Alert.Heading>{t('components.formatVisualization.emptyStates.notConfiguredTitle')}</Alert.Heading>
                <p>
                  {t('components.formatVisualization.emptyStates.notConfiguredMessage')}
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
