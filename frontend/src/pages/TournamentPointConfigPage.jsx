import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Form, Button, Alert, Spinner, Row, Col, Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import NavBar from '../components/NavBar';
import apiClient from '../services/apiClient';
import {
    getTournamentById,
    getTournamentPointConfig,
    updateTournamentPointConfig,
    calculateTournamentPoints,
    POINT_CALCULATION_METHODS,
    TOURNAMENT_STATUS
} from '../services/tournamentService';

const TournamentPointConfigPage = () => {
    const { t } = useTranslation();
    const { id } = useParams();
    const navigate = useNavigate();

    const [tournament, setTournament] = useState(null);
    const [config, setConfig] = useState({
        calculationMethod: POINT_CALCULATION_METHODS.PLACEMENT,
        multiplicativeValue: 1.0,
        doublePointsEnabled: false
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Calculate Points state
    const [calculating, setCalculating] = useState(false);
    const [calcError, setCalcError] = useState(null);
    const [calcSuccess, setCalcSuccess] = useState(null);
    const [unresolvedGroups, setUnresolvedGroups] = useState([]);
    const [tiesLoading, setTiesLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [tournamentData, configData] = await Promise.all([
                getTournamentById(id),
                getTournamentPointConfig(id)
            ]);
            setTournament(tournamentData);
            setConfig({
                calculationMethod: configData.calculationMethod,
                multiplicativeValue: configData.multiplicativeValue,
                doublePointsEnabled: configData.doublePointsEnabled
            });

            // For GROUP/COMBINED tournaments, check for unresolved ties to guard Calculate Points
            if (tournamentData.formatType === 'GROUP' || tournamentData.formatType === 'COMBINED') {
                setTiesLoading(true);
                try {
                    const structureRes = await apiClient.get(`/v1/tournaments/${id}/format-structure`);
                    const structure = structureRes.data?.data || structureRes.data;
                    if (structure?.groups) {
                        const unresolved = [];
                        for (const group of structure.groups) {
                            const standingsRes = await apiClient.get(`/v1/tournaments/${id}/groups/${group.id}/standings`);
                            const standingsData = standingsRes.data?.data || standingsRes.data;
                            if (standingsData?.unresolvedTies?.length > 0) {
                                unresolved.push(group.name || `Group ${group.groupNumber}`);
                            }
                        }
                        setUnresolvedGroups(unresolved);
                    }
                } catch (_err) {
                    // Non-critical — button will still be available, backend blocks if ties exist
                } finally {
                    setTiesLoading(false);
                }
            }
        } catch (_err) {
            setError(t('errors.failedToLoad', { resource: t('common.configuration') }));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            setError(null);
            setSuccess(null);

            await updateTournamentPointConfig(id, config);
            setSuccess(t('messages.configurationSaved'));
        } catch (err) {
            setError(err.message || t('errors.failedToSave'));
        } finally {
            setSaving(false);
        }
    };

    const handleCalculatePoints = async () => {
        try {
            setCalculating(true);
            setCalcError(null);
            setCalcSuccess(null);

            // Both GROUP and COMBINED: send empty body (null results)
            // Backend auto-derives group results from standings AND knockout
            // results from bracket match records. No client-side results needed.
            await calculateTournamentPoints(id, null);

            setCalcSuccess('Points calculated and awarded successfully.');
        } catch (err) {
            if (err.code === 'UNRESOLVED_TIES') {
                setCalcError(err.message);
                // Refresh unresolved groups list
                await loadData();
            } else {
                setCalcError(err.message || 'Could not calculate points.');
            }
        } finally {
            setCalculating(false);
        }
    };

    if (loading) {
        return (
            <>
                <NavBar />
                <Container className="mt-4 text-center">
                    <Spinner animation="border" />
                </Container>
            </>
        );
    }

    if (!tournament) {
        return (
            <>
                <NavBar />
                <Container className="mt-4">
                    <Alert variant="danger">{t('errors.tournamentNotFound')}</Alert>
                </Container>
            </>
        );
    }

    const isEditable = tournament.status === TOURNAMENT_STATUS.SCHEDULED;

    return (
        <>
            <NavBar />
            <Container className="mt-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2>{t('pages.pointConfig.title')}</h2>
                        <h5 className="text-muted">{tournament.name}</h5>
                    </div>
                    <Button variant="outline-secondary" onClick={() => navigate('/organizer/tournaments')}>
                        {t('buttons.backToTournaments')}
                    </Button>
                </div>

                {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
                {success && <Alert variant="success" dismissible onClose={() => setSuccess(null)}>{success}</Alert>}

                {!isEditable && (
                    <Alert variant="info">
                        {t('alerts.pointConfigReadOnly', { status: t(`tournament.statuses.${tournament.status}`) })}
                    </Alert>
                )}

                {/* Calculate Points Section — shown for COMPLETED GROUP/COMBINED tournaments */}
                {tournament.status === TOURNAMENT_STATUS.COMPLETED &&
                 (tournament.formatType === 'GROUP' || tournament.formatType === 'COMBINED') && (
                    <Card className="mb-4">
                        <Card.Header><h5 className="mb-0">Calculate Points</h5></Card.Header>
                        <Card.Body>
                            {calcSuccess && (
                                <Alert variant="success" dismissible onClose={() => setCalcSuccess(null)}>
                                    {calcSuccess}
                                </Alert>
                            )}
                            {calcError && (
                                <Alert variant="danger" dismissible onClose={() => setCalcError(null)}>
                                    {calcError}
                                </Alert>
                            )}

                            {unresolvedGroups.length > 0 && (
                                <Alert variant="danger">
                                    Groups {unresolvedGroups.join(', ')} have unresolved tied positions.
                                    Open each group&apos;s standings and use &apos;Resolve Tie&apos; before calculating points.
                                </Alert>
                            )}

                            {tiesLoading ? (
                                <Spinner animation="border" size="sm" />
                            ) : (
                                <OverlayTrigger
                                    overlay={
                                        unresolvedGroups.length > 0
                                            ? <Tooltip>Resolve all group tiebreakers first</Tooltip>
                                            : <></>
                                    }
                                >
                                    <span>
                                        <Button
                                            variant="primary"
                                            disabled={calculating || unresolvedGroups.length > 0}
                                            onClick={handleCalculatePoints}
                                        >
                                            {calculating ? (
                                                <>
                                                    <Spinner as="span" size="sm" animation="border" className="me-2" />
                                                    Calculating...
                                                </>
                                            ) : (
                                                'Calculate Points'
                                            )}
                                        </Button>
                                    </span>
                                </OverlayTrigger>
                            )}
                        </Card.Body>
                    </Card>
                )}

                <Card>
                    <Card.Header as="h5">{t('headers.pointCalculationSettings')}</Card.Header>
                    <Card.Body>
                        <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-4">
                                <Form.Label className="fw-bold">{t('form.labels.calculationMethod')}</Form.Label>
                                <div>
                                    <Form.Check
                                        type="radio"
                                        id="method-placement"
                                        label={
                                            <div>
                                                <strong>{t('pointConfig.methods.placement.label')}</strong>
                                                <p className="text-muted small mb-0">{t('pointConfig.methods.placement.description')}</p>
                                            </div>
                                        }
                                        name="calculationMethod"
                                        value={POINT_CALCULATION_METHODS.PLACEMENT}
                                        checked={config.calculationMethod === POINT_CALCULATION_METHODS.PLACEMENT}
                                        onChange={(e) => setConfig({ ...config, calculationMethod: e.target.value })}
                                        disabled={!isEditable}
                                        className="mb-3"
                                    />
                                    <Form.Check
                                        type="radio"
                                        id="method-final-round"
                                        label={
                                            <div>
                                                <strong>{t('pointConfig.methods.finalRound.label')}</strong>
                                                <p className="text-muted small mb-0">{t('pointConfig.methods.finalRound.description')}</p>
                                            </div>
                                        }
                                        name="calculationMethod"
                                        value={POINT_CALCULATION_METHODS.FINAL_ROUND}
                                        checked={config.calculationMethod === POINT_CALCULATION_METHODS.FINAL_ROUND}
                                        onChange={(e) => setConfig({ ...config, calculationMethod: e.target.value })}
                                        disabled={!isEditable}
                                    />
                                </div>
                            </Form.Group>

                            {config.calculationMethod === POINT_CALCULATION_METHODS.PLACEMENT && (
                                <Form.Group className="mb-4">
                                    <Form.Label className="fw-bold">{t('form.labels.multiplicativeValue')}</Form.Label>
                                    <Row>
                                        <Col md={4}>
                                            <Form.Control
                                                type="number"
                                                step="0.1"
                                                min="0.1"
                                                value={config.multiplicativeValue}
                                                onChange={(e) => setConfig({ ...config, multiplicativeValue: parseFloat(e.target.value) })}
                                                disabled={!isEditable}
                                            />
                                        </Col>
                                    </Row>
                                    <Form.Text className="text-muted">
                                        {t('help.multiplicativeValue')}
                                    </Form.Text>
                                </Form.Group>
                            )}

                            <Form.Group className="mb-4">
                                <Form.Check
                                    type="switch"
                                    id="double-points"
                                    label={
                                        <span className="fw-bold">
                                            {t('form.labels.doublePointsEnabled')}
                                            <Badge bg="warning" text="dark" className="ms-2">{t('badges.bonus')}</Badge>
                                        </span>
                                    }
                                    checked={config.doublePointsEnabled}
                                    onChange={(e) => setConfig({ ...config, doublePointsEnabled: e.target.checked })}
                                    disabled={!isEditable}
                                />
                                <Form.Text className="text-muted">
                                    {t('help.doublePointsDescription')}
                                </Form.Text>
                            </Form.Group>

                            {isEditable && (
                                <div className="d-flex justify-content-end">
                                    <Button type="submit" variant="primary" disabled={saving}>
                                        {saving ? t('common.saving') : t('buttons.saveConfiguration')}
                                    </Button>
                                </div>
                            )}
                        </Form>
                    </Card.Body>
                </Card>
            </Container>
        </>
    );
};

export default TournamentPointConfigPage;
