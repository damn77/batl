import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Form, Button, Alert, Spinner, Row, Col, Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import NavBar from '../components/NavBar';
import {
    getTournamentById,
    getTournamentPointConfig,
    updateTournamentPointConfig,
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
        } catch (err) {
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
