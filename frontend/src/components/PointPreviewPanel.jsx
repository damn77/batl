import { useState, useEffect } from 'react';
import { Card, Table, Spinner, Alert } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { getTournamentPointPreview } from '../services/pointTableService';

const ROUND_LABELS = {
    FINAL:        'Final',
    SEMIFINAL:    'Semifinal',
    QUARTERFINAL: 'Quarterfinal',
    SECOND_ROUND: '2nd Round',
    FIRST_ROUND:  '1st Round',
};

const ROUND_ORDER = ['FINAL', 'SEMIFINAL', 'QUARTERFINAL', 'SECOND_ROUND', 'FIRST_ROUND'];

const formatRound = (key) => ROUND_LABELS[key] || key;

const PointPreviewPanel = ({ tournamentId }) => {
    const { t } = useTranslation();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (tournamentId) {
            loadPreview();
        }
    }, [tournamentId]);

    const loadPreview = async () => {
        try {
            setLoading(true);
            const result = await getTournamentPointPreview(tournamentId);
            setData(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Spinner animation="border" size="sm" />;
    if (error) return <Alert variant="warning">{t('errors.loadingPoints') || 'Error loading points'}</Alert>;
    if (!data || !data.pointTable) return null;

    const { pointTable, effectiveRange, participantCount } = data;

    const mainRounds = Object.keys(pointTable.main || {});
    const hasConsolation = Object.keys(pointTable.consolation || {}).length > 0;

    const sortedRounds = [...mainRounds].sort((a, b) => {
        const ai = ROUND_ORDER.indexOf(a);
        const bi = ROUND_ORDER.indexOf(b);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

    return (
        <Card className="mb-4 shadow-sm">
            <Card.Header className="bg-light">
                <h5 className="mb-0">{t('common.pointDistribution') || 'Point Distribution'}</h5>
            </Card.Header>
            <Card.Body>
                <p className="text-muted small mb-3">
                    {t('messages.pointPreviewDescription', { count: participantCount, range: effectiveRange }) ||
                        `Based on ${participantCount} participants (Range: ${effectiveRange})`}
                </p>
                <div className="table-responsive">
                    <Table size="sm" bordered hover>
                        <thead>
                            <tr>
                                <th>{t('common.round') || 'Round'}</th>
                                <th>{t('common.main') || 'Main'}</th>
                                {hasConsolation && <th>{t('common.consolation') || 'Consolation'}</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedRounds.map(round => (
                                <tr key={round}>
                                    <td>{formatRound(round)}</td>
                                    <td>{pointTable.main[round] ?? '-'}</td>
                                    {hasConsolation && <td>{pointTable.consolation[round] ?? '-'}</td>}
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>
            </Card.Body>
        </Card>
    );
};

export default PointPreviewPanel;
