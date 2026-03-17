// T072, T088-T091: Format Visualization Wrapper - Selects correct visualization with lazy loading
import { Alert, Spinner, Tab, Nav, Accordion, ProgressBar } from 'react-bootstrap';
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
  // Also fetch for GROUP and COMBINED formats to compute per-group progress bars and groupsComplete.
  const hasBrackets = !!(structure?.brackets && structure.brackets.length > 0);
  const hasGroups = !!(structure?.groups && structure.groups.length > 0);
  const { matches, mutate: mutateMatches } = useMatches(
    tournament?.id,
    {},
    hasBrackets || hasGroups
  );

  // Compute whether all group matches are COMPLETED or CANCELLED
  const computeGroupsComplete = (allMatches, groups) => {
    if (!allMatches || !groups || groups.length === 0) return false;
    const groupIds = new Set(groups.map(g => g.id));
    const groupMatches = allMatches.filter(m => m.groupId && groupIds.has(m.groupId));
    if (groupMatches.length === 0) return false;
    return groupMatches.every(m => m.status === 'COMPLETED' || m.status === 'CANCELLED');
  };

  // Compute completion percentage for a single group
  const computeGroupCompletionPct = (allMatches, groupId) => {
    if (!allMatches) return 0;
    const groupMatches = allMatches.filter(m => m.groupId === groupId);
    if (groupMatches.length === 0) return 0;
    const completed = groupMatches.filter(m => m.status === 'COMPLETED' || m.status === 'CANCELLED').length;
    return Math.round((completed / groupMatches.length) * 100);
  };

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
                  {structure.groups?.length > 0 ? (
                    <Accordion defaultActiveKey={tournament.status === 'IN_PROGRESS' ? structure.groups[0]?.id : null}>
                      {structure.groups.map(group => (
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
                                now={computeGroupCompletionPct(matches, group.id)}
                                variant="success"
                                style={{ height: '4px', marginTop: '4px' }}
                              />
                            </div>
                          </Accordion.Header>
                          <Accordion.Body>
                            <GroupStandingsTable
                              tournamentId={tournament.id}
                              group={group}
                              isOrganizer={isOrganizerOrAdmin}
                              currentUserPlayerId={currentUserPlayerId}
                              scoringRules={tournament.defaultScoringRules}
                              tournamentStatus={tournament.status}
                            />
                          </Accordion.Body>
                        </Accordion.Item>
                      ))}
                    </Accordion>
                  ) : (
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
                    tournament={tournament}
                    groups={structure.groups || []}
                    brackets={structure.brackets || []}
                    rounds={structure.rounds || []}
                    isOrganizer={isOrganizerOrAdmin}
                    currentUserPlayerId={currentUserPlayerId}
                    scoringRules={tournament.defaultScoringRules}
                    groupsComplete={computeGroupsComplete(matches, structure.groups)}
                    allMatches={matches}
                  />
                </>
              ) : (
                /* Everyone else: combined format display */
                <CombinedFormatDisplay
                  tournamentId={tournament.id}
                  tournament={tournament}
                  groups={structure.groups || []}
                  brackets={structure.brackets || []}
                  rounds={structure.rounds || []}
                  isOrganizer={isOrganizerOrAdmin}
                  currentUserPlayerId={currentUserPlayerId}
                  scoringRules={tournament.defaultScoringRules}
                  groupsComplete={computeGroupsComplete(matches, structure.groups)}
                  allMatches={matches}
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
