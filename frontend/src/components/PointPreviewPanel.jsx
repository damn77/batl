import { useState, useEffect } from 'react';
import { Card, Table, Spinner, Alert } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { getTournamentPointPreview } from '../services/pointTableService';

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
                                <th>{t('common.consolation') || 'Consolation'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.keys(pointTable.main || {}).map(round => (
                                <tr key={round}>
                                    <td>{round}</td>
                                    <td>{pointTable.main[round] || '-'}</td>
                                    <td>{pointTable.consolation[round] || '-'}</td>
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
