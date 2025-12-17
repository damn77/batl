import { useState, useEffect } from 'react';
import { Modal, Table, Spinner, Alert, Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { getRankingEntryBreakdown } from '../services/rankingService';

const RankingEntryDetailModal = ({ show, onHide, categoryId, entryId }) => {
    const { t } = useTranslation();
    const [entry, setEntry] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (show && categoryId && entryId) {
            loadData();
        } else {
            setEntry(null);
        }
    }, [show, categoryId, entryId]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getRankingEntryBreakdown(categoryId, entryId);
            setEntry(data);
        } catch (err) {
            setError(t('errors.failedToLoad', { resource: t('common.details') }));
        } finally {
            setLoading(false);
        }
    };

    const getName = () => {
        if (!entry) return '';
        if (entry.entityType === 'PLAYER') {
            return entry.player?.name;
        } else if (entry.entityType === 'PAIR') {
            return `${entry.pair?.player1?.name} / ${entry.pair?.player2?.name}`;
        }
        return '';
    };

    return (
        <Modal show={show} onHide={onHide} size="lg">
            <Modal.Header closeButton>
                <Modal.Title>
                    {loading ? t('common.loading') : getName()}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {loading ? (
                    <div className="text-center py-4">
                        <Spinner animation="border" />
                    </div>
                ) : error ? (
                    <Alert variant="danger">{error}</Alert>
                ) : entry ? (
                    <>
                        <div className="d-flex justify-content-between mb-4">
                            <div>
                                <h5>{t('table.headers.rank')}: <Badge bg="primary">{entry.rank}</Badge></h5>
                            </div>
                            <div>
                                <h5>{t('table.headers.points')}: {entry.totalPoints}</h5>
                            </div>
                        </div>

                        <h6>{t('table.headers.tournaments')}</h6>
                        <Table striped bordered hover size="sm">
                            <thead>
                                <tr>
                                    <th>{t('table.headers.dates')}</th>
                                    <th>{t('table.headers.tournamentName')}</th>
                                    <th>{t('table.headers.placement')}</th>
                                    <th>{t('table.headers.points')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entry.tournamentResults.map(result => (
                                    <tr key={result.id}>
                                        <td>{new Date(result.tournament.endDate).toLocaleDateString()}</td>
                                        <td>{result.tournament.name}</td>
                                        <td>{result.placement ? `${result.placement}.` : result.finalRoundReached}</td>
                                        <td>{result.pointsAwarded}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </>
                ) : null}
            </Modal.Body>
        </Modal>
    );
};

export default RankingEntryDetailModal;
