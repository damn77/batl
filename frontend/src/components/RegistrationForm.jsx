// RegistrationForm - Reusable form component for tournament registration
import { Form, Button, Spinner, Alert } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

/**
 * RegistrationForm - Unified form component for singles/doubles registration
 * Handles entity selection and registration submission
 * 
 * @param {Object} props
 * @param {Array} props.entities - List of players or pairs to select from
 * @param {string} props.selectedId - Currently selected entity ID
 * @param {Function} props.onSelect - Handler for entity selection
 * @param {Function} props.onSubmit - Handler for form submission
 * @param {boolean} props.loading - Loading state
 * @param {boolean} props.disabled - Disable form
 * @param {boolean} props.isDoubles - Whether this is for doubles registration
 * @param {string} props.categoryName - Category name for help text
 * @param {string|JSX.Element} props.error - Error message
 * @param {string} props.success - Success message
 * @param {Function} props.onClearError - Handler to clear error
 * @param {Function} props.onClearSuccess - Handler to clear success
 * @param {boolean} props.isFull - Whether tournament is full
 */
const RegistrationForm = ({
    entities,
    selectedId,
    onSelect,
    onSubmit,
    loading,
    disabled,
    isDoubles,
    categoryName,
    error,
    success,
    onClearError,
    onClearSuccess,
    isFull,
}) => {
    const { t } = useTranslation();
    const entityType = isDoubles ? t('form.options.doubles') : t('form.options.player');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit();
    };

    return (
        <Form onSubmit={handleSubmit}>
            {error && (
                <Alert variant="danger" dismissible onClose={onClearError}>
                    {error}
                </Alert>
            )}
            {success && (
                <Alert variant="success" dismissible onClose={onClearSuccess}>
                    {success}
                </Alert>
            )}

            <Form.Group className="mb-3">
                <Form.Label>{t('registration.selectEntity', { entityType })}</Form.Label>
                <Form.Select
                    value={selectedId}
                    onChange={(e) => onSelect(e.target.value)}
                    disabled={loading || disabled}
                >
                    <option value="">{t('registration.chooseEntity', { entityType })}</option>
                    {entities.map((entity) => (
                        <option key={entity.id} value={entity.id}>
                            {isDoubles
                                ? `${entity.player1?.name} & ${entity.player2?.name} (${t('table.headers.seedingScore')}: ${entity.seedingScore || 0})`
                                : entity.name}
                        </option>
                    ))}
                </Form.Select>
                <Form.Text className="text-muted">
                    {isDoubles
                        ? t('registration.pairsInCategoryHint', { categoryName })
                        : t('registration.allPlayersHint')}
                </Form.Text>
            </Form.Group>

            <Button
                variant="primary"
                type="submit"
                disabled={loading || !selectedId || disabled}
            >
                {loading ? (
                    <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        {t('registration.registering')}
                    </>
                ) : (
                    t('registration.registerEntity', { entityType })
                )}
            </Button>

            {isFull && (
                <Form.Text className="d-block mt-2 text-warning">
                    <strong>{t('common.note')}:</strong> {t('registration.capacityWarning')}
                </Form.Text>
            )}
        </Form>
    );
};

export default RegistrationForm;
