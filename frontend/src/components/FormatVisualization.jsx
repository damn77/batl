// T072, T088-T091: Format Visualization Wrapper - Selects correct visualization with lazy loading
import { Alert, Spinner, Tab, Nav } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useFormatStructure, useMatches } from '../services/tournamentViewService';
import { useAuth } from '../utils/AuthContext';
import GroupStandingsTable from './GroupStandingsTable';
import KnockoutBracket from './KnockoutBracket';
import SwissRoundPairings from './SwissRoundPairings';
import CombinedFormatDisplay from './CombinedFormatDisplay';
import ExpandableSection from './ExpandableSection';
import BracketGenerationSection from './BracketGenerationSection';
import GroupDrawGenerationSection from './GroupDrawGenerationSection';

/**
 * FormatVisualization - Main wrapper that selects correct visualization based on formatType
 * T088: Implements lazy loading - only fetches format structure when section is expanded
 * T090-T091: Includes loading skeletons
 *
 * @param {Object} tournament - Tournament object with formatType
 * @param {Function} mutateTournament - SWR mutate function for tournament data
 */
const FormatVisualization = ({ tournament, mutateTournament, registrationVersion }) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Always load format structure when component mounts (Accordion controls visibility)
  const { structure, isLoading, isError, mutate: mutateFormatStructure } = useFormatStructure(
    tournament?.id,
    true
  );

  // T050: Get current user's player profile ID for My Match feature
  const currentUserPlayerId = user?.playerId || null;

  // Role check for organizer/admin draw workflow
  const isOrganizerOrAdmin = user?.role === 'ORGANIZER' || user?.role === 'ADMIN';

  // For organizer KNOCKOUT view: fetch matches from ALL brackets so BracketGenerationSection
  // slot dropdowns include both MAIN and CONSOLATION bracket rounds.
  const hasBrackets = !!(structure?.brackets && structure.brackets.length > 0);
  const { matches, mutate: mutateMatches } = useMatches(
    tournament?.id,
    {},
    hasBrackets
  );

  if (!tournament) return null;

  const formatType = tournament.formatType;

  const sortedBrackets = structure?.brackets
    ? [...structure.brackets].sort((a, b) => a.bracketType === 'MAIN' ? -1 : b.bracketType === 'MAIN' ? 1 : 0)
    : [];

  return (
    <>
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
        </Alert>
      )}

      {/* Render appropriate visualization based on format type */}
      {!isLoading && !isError && structure && (
        <>
          {formatType === 'GROUP' && (
            <div className="d-flex flex-column gap-4">
              {isOrganizerOrAdmin && (tournament.status === 'SCHEDULED' || (tournament.status === 'IN_PROGRESS' && !(structure?.groups?.length > 0))) ? (
                /* Organizer/Admin SCHEDULED or IN_PROGRESS-without-groups: full draw workflow */
                <GroupDrawGenerationSection
                  tournament={tournament}
                  mutateTournament={mutateTournament}
                  mutateFormatStructure={mutateFormatStructure}
                  mutateMatches={mutateMatches}
                  structure={structure}
                  matches={matches}
                  registrationVersion={registrationVersion}
                />
              ) : (
                /* Everyone else (or organizer for IN_PROGRESS/COMPLETED with groups): group standings view */
                <>
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
                </>
              )}
            </div>
          )}

          {formatType === 'KNOCKOUT' && (
            <div className="d-flex flex-column">
              {isOrganizerOrAdmin && (tournament.status === 'SCHEDULED' || (tournament.status === 'IN_PROGRESS' && !(structure?.brackets?.length > 0))) ? (
                /* Organizer/Admin SCHEDULED or IN_PROGRESS-without-bracket: full draw workflow */
                <BracketGenerationSection
                  tournament={tournament}
                  mutateTournament={mutateTournament}
                  mutateFormatStructure={mutateFormatStructure}
                  mutateMatches={mutateMatches}
                  structure={structure}
                  matches={matches}
                  registrationVersion={registrationVersion}
                />
              ) : (
                /* Everyone (incl. organizers for IN_PROGRESS/COMPLETED): bracket view */
                <>
                  {(!structure.brackets || structure.brackets.length === 0) && (
                    <Alert variant="info">
                      {t('components.formatVisualization.emptyStates.noBrackets')}
                    </Alert>
                  )}
                  {structure.brackets?.length === 1 && structure.brackets.map(bracket => {
                    const bracketRounds = structure.rounds?.filter(r => r.bracketId === bracket.id) || [];
                    return (
                      <KnockoutBracket
                        key={bracket.id}
                        tournamentId={tournament.id}
                        bracket={bracket}
                        rounds={bracketRounds}
                        currentUserPlayerId={currentUserPlayerId}
                        tournamentStatus={tournament.status}
                        isDoubles={tournament.category?.type === 'DOUBLES'}
                        scoringRules={tournament.defaultScoringRules}
                      />
                    );
                  })}
                  {sortedBrackets.length > 1 && (
                    <Tab.Container defaultActiveKey={sortedBrackets[0].id}>
                      <Nav variant="tabs">
                        {sortedBrackets.map(bracket => (
                          <Nav.Item key={bracket.id}>
                            <Nav.Link
                              eventKey={bracket.id}
                              style={bracket.bracketType === 'CONSOLATION' ? { backgroundColor: '#fff8f0' } : undefined}
                            >
                              {bracket.name || (bracket.bracketType === 'CONSOLATION' ? 'Consolation Bracket' : 'Main Bracket')}
                            </Nav.Link>
                          </Nav.Item>
                        ))}
                      </Nav>
                      <Tab.Content>
                        {sortedBrackets.map(bracket => {
                          const bracketRounds = structure.rounds?.filter(r => r.bracketId === bracket.id) || [];
                          return (
                            <Tab.Pane
                              key={bracket.id}
                              eventKey={bracket.id}
                              style={bracket.bracketType === 'CONSOLATION' ? { backgroundColor: '#fff8f0', margin: '-1rem', marginTop: 0, padding: '1rem', paddingTop: '1rem' } : { paddingTop: '1rem' }}
                            >
                              <KnockoutBracket
                                tournamentId={tournament.id}
                                bracket={bracket}
                                rounds={bracketRounds}
                                currentUserPlayerId={currentUserPlayerId}
                                tournamentStatus={tournament.status}
                                isDoubles={tournament.category?.type === 'DOUBLES'}
                                scoringRules={tournament.defaultScoringRules}
                              />
                            </Tab.Pane>
                          );
                        })}
                      </Tab.Content>
                    </Tab.Container>
                  )}
                </>
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
            <div className="d-flex flex-column gap-4">
              {isOrganizerOrAdmin && tournament.status === 'SCHEDULED' && !(structure?.groups?.length > 0) ? (
                /* Organizer SCHEDULED without groups: group draw generation first */
                <GroupDrawGenerationSection
                  tournament={tournament}
                  mutateTournament={mutateTournament}
                  mutateFormatStructure={mutateFormatStructure}
                  mutateMatches={mutateMatches}
                  structure={structure}
                  matches={matches}
                  registrationVersion={registrationVersion}
                />
              ) : isOrganizerOrAdmin && tournament.status === 'SCHEDULED' && structure?.groups?.length > 0 ? (
                /* Organizer SCHEDULED with groups generated: draw section (swap/regenerate) + combined view */
                <>
                  <GroupDrawGenerationSection
                    tournament={tournament}
                    mutateTournament={mutateTournament}
                    mutateFormatStructure={mutateFormatStructure}
                    mutateMatches={mutateMatches}
                    structure={structure}
                    matches={matches}
                    registrationVersion={registrationVersion}
                  />
                  <CombinedFormatDisplay
                    tournamentId={tournament.id}
                    groups={structure.groups || []}
                    brackets={structure.brackets || []}
                    rounds={structure.rounds || []}
                  />
                </>
              ) : (
                /* Everyone else: combined format display */
                <CombinedFormatDisplay
                  tournamentId={tournament.id}
                  groups={structure.groups || []}
                  brackets={structure.brackets || []}
                  rounds={structure.rounds || []}
                />
              )}
            </div>
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
    </>
  );
};

export default FormatVisualization;
