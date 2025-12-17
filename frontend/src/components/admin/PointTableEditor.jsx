import { useState, useEffect } from 'react';
import { Table, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { getAllPointTables, updatePointTableValue } from '../../services/pointTableService';

const PointTableEditor = () => {
    const { t } = useTranslation();
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadTables();
    }, []);

    const loadTables = async () => {
        try {
            setLoading(true);
            const data = await getAllPointTables();
            setTables(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (table) => {
        setEditingId(table.id);
        setEditValue(table.points);
    };

    const handleSave = async (id) => {
        try {
            setSaving(true);
            await updatePointTableValue(id, parseInt(editValue, 10));
            setEditingId(null);
            await loadTables();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditValue('');
    };

    if (loading) return <Spinner animation="border" />;

    // Group by range
    const grouped = tables.reduce((acc, table) => {
        if (!acc[table.participantRange]) acc[table.participantRange] = [];
        acc[table.participantRange].push(table);
        return acc;
    }, {});

    return (
        <div>
            {error && <Alert variant="danger">{error}</Alert>}
            {Object.entries(grouped).map(([range, items]) => (
                <div key={range} className="mb-4">
                    <h4>{t('common.participants') || 'Participants'}: {range}</h4>
                    <Table striped bordered hover>
                        <thead>
                            <tr>
                                <th>{t('common.round') || 'Round'}</th>
                                <th>{t('common.bracket') || 'Bracket'}</th>
                                <th>{t('common.points') || 'Points'}</th>
                                <th>{t('common.actions') || 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(table => (
                                <tr key={table.id}>
                                    <td>{table.roundName}</td>
                                    <td>{table.isConsolation ? (t('common.consolation') || 'Consolation') : (t('common.main') || 'Main')}</td>
                                    <td>
                                        {editingId === table.id ? (
                                            <Form.Control
                                                type="number"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                size="sm"
                                            />
                                        ) : (
                                            table.points
                                        )}
                                    </td>
                                    <td>
                                        {editingId === table.id ? (
                                            <>
                                                <Button variant="success" size="sm" onClick={() => handleSave(table.id)} disabled={saving}>
                                                    {saving ? '...' : (t('common.save') || 'Save')}
                                                </Button>{' '}
                                                <Button variant="secondary" size="sm" onClick={handleCancel} disabled={saving}>
                                                    {t('common.cancel') || 'Cancel'}
                                                </Button>
                                            </>
                                        ) : (
                                            <Button variant="outline-primary" size="sm" onClick={() => handleEdit(table)}>
                                                {t('common.edit') || 'Edit'}
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>
            ))}
        </div>
    );
};

export default PointTableEditor;
