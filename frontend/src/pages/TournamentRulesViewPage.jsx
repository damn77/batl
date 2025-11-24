// T052-T054: TournamentRulesViewPage - View tournament rules and format
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Row, Col, Alert, Spinner, Card } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import NavBar from '../components/NavBar';
import TournamentFormatDisplay from '../components/TournamentFormatDisplay';
import RuleCascadeViewer from '../components/RuleCascadeViewer';
import { getTournamentFormat, getAllRuleOverrides } from '../services/tournamentRulesService';

/**
 * Page for viewing tournament rules, format, and rule overrides
 * Accessible to all authenticated users (players, organizers, admins)
 */
const TournamentRulesViewPage = () => {
  const { t } = useTranslation();
  const { id } = useParams(); // Tournament ID
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [tournament, setTournament] = useState(null);
  const [ruleOverrides, setRuleOverrides] = useState(null);

  useEffect(() => {
    loadTournamentRules();
  }, [id]);

  const loadTournamentRules = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load tournament format and all rule overrides in parallel
      const [formatData, overridesData] = await Promise.all([
        getTournamentFormat(id),
        getAllRuleOverrides(id)
      ]);

      if (formatData.success) {
        setTournament(formatData.data);
      } else {
        throw new Error(formatData.error?.message || t('errors.failedToLoad', { resource: t('common.tournamentFormat') }));
      }

      if (overridesData.success) {
        setRuleOverrides(overridesData.data);
      }
    } catch (err) {
      setError(err.message || t('errors.failedToLoad', { resource: t('common.tournamentRules') }));
    } finally {
      setLoading(false);
    }
  };

  // Helper to check if there are any rule overrides
  const hasRuleOverrides = () => {
    if (!ruleOverrides) return false;
    return (
      ruleOverrides.groups.length > 0 ||
      ruleOverrides.brackets.length > 0 ||
      ruleOverrides.rounds.length > 0 ||
      ruleOverrides.matches.length > 0
    );
  };

  return (
    <>
      <NavBar />
      <Container className="mt-4">
        <Row className="mb-4">
          <Col>
            <h2>{t('pages.tournamentRules.title')}</h2>
            {tournament && (
              <p className="text-muted">{tournament.name}</p>
            )}
          </Col>
        </Row>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" />
            <p className="mt-3 text-muted">{t('messages.loadingTournamentRules')}</p>
          </div>
        ) : (
          <Row>
            <Col lg={6} className="mb-4">
              {/* T054: Integrate TournamentFormatDisplay */}
              <TournamentFormatDisplay tournament={tournament} />
            </Col>

            <Col lg={6} className="mb-4">
              {/* Display default scoring rules */}
              <Card>
                <Card.Header>
                  <h5 className="mb-0">{t('pages.tournamentRules.defaultScoringRules')}</h5>
                </Card.Header>
                <Card.Body>
                  {tournament?.defaultScoringRules ? (
                    <>
                      <p className="text-muted small mb-3">
                        {t('help.defaultScoringRulesDescription')}
                      </p>
                      {/* T053: Integrate RuleCascadeViewer for tournament defaults */}
                      <RuleCascadeViewer
                        effectiveRules={{
                          source: 'CASCADED',
                          rules: tournament.defaultScoringRules,
                          cascade: [{ level: 'tournament', source: 'default' }]
                        }}
                      />
                    </>
                  ) : (
                    <Alert variant="info" className="mb-0">
                      {t('messages.noDefaultScoringRules')}
                    </Alert>
                  )}
                </Card.Body>
              </Card>
            </Col>

            {/* Rule Overrides Section */}
            {hasRuleOverrides() && (
              <Col xs={12} className="mb-4">
                <Card>
                  <Card.Header>
                    <h5 className="mb-0">{t('pages.tournamentRules.ruleOverrides')}</h5>
                  </Card.Header>
                  <Card.Body>
                    <p className="text-muted small">
                      {t('help.ruleOverridesDescription')}
                    </p>

                    {ruleOverrides.groups.length > 0 && (
                      <div className="mb-3">
                        <h6>{t('pages.tournamentRules.groupOverrides')}</h6>
                        {ruleOverrides.groups.map(group => (
                          <Card key={group.id} bg="light" className="mb-2">
                            <Card.Body className="py-2">
                              <strong>{t('common.group')} {group.groupNumber}</strong>
                              <pre className="small mb-0 mt-1">{JSON.stringify(group.ruleOverrides, null, 2)}</pre>
                            </Card.Body>
                          </Card>
                        ))}
                      </div>
                    )}

                    {ruleOverrides.brackets.length > 0 && (
                      <div className="mb-3">
                        <h6>{t('pages.tournamentRules.bracketOverrides')}</h6>
                        {ruleOverrides.brackets.map(bracket => (
                          <Card key={bracket.id} bg="light" className="mb-2">
                            <Card.Body className="py-2">
                              <strong>{bracket.bracketType} {t('common.bracket')}</strong>
                              <pre className="small mb-0 mt-1">{JSON.stringify(bracket.ruleOverrides, null, 2)}</pre>
                            </Card.Body>
                          </Card>
                        ))}
                      </div>
                    )}

                    {ruleOverrides.rounds.length > 0 && (
                      <div className="mb-3">
                        <h6>{t('pages.tournamentRules.roundOverrides')}</h6>
                        {ruleOverrides.rounds.map(round => (
                          <Card key={round.id} bg="light" className="mb-2">
                            <Card.Body className="py-2">
                              <strong>{t('common.round')} {round.roundNumber}</strong>
                              <pre className="small mb-0 mt-1">{JSON.stringify(round.ruleOverrides, null, 2)}</pre>
                            </Card.Body>
                          </Card>
                        ))}
                      </div>
                    )}

                    {ruleOverrides.matches.length > 0 && (
                      <div className="mb-3">
                        <h6>{t('pages.tournamentRules.matchOverrides')}</h6>
                        {ruleOverrides.matches.map(match => (
                          <Card key={match.id} bg="light" className="mb-2">
                            <Card.Body className="py-2">
                              <strong>{t('common.match')} {match.matchNumber}</strong>
                              <pre className="small mb-0 mt-1">{JSON.stringify(match.ruleOverrides, null, 2)}</pre>
                            </Card.Body>
                          </Card>
                        ))}
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            )}
          </Row>
        )}
      </Container>
    </>
  );
};

export default TournamentRulesViewPage;
