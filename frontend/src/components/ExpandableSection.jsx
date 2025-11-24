// T073: Expandable Section Component - Reusable expand/collapse wrapper
import { useState } from 'react';
import { Card, Button, Collapse } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

/**
 * ExpandableSection - Reusable component for expand/collapse functionality
 * Used by format visualizations (brackets, groups, rounds)
 *
 * @param {string} title - Section title
 * @param {React.Node} children - Content to show when expanded
 * @param {boolean} defaultExpanded - Whether section starts expanded (default: false)
 * @param {function} onExpand - Optional callback when section is expanded (for lazy loading)
 * @param {boolean} loading - Whether content is loading
 * @param {React.Node} badge - Optional badge to show next to title (e.g., player count)
 */
const ExpandableSection = ({
  title,
  children,
  defaultExpanded = false,
  onExpand,
  loading = false,
  badge
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleToggle = () => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);

    // Call onExpand callback when expanding (for lazy loading)
    if (newExpandedState && onExpand) {
      onExpand();
    }
  };

  return (
    <Card className="mb-3 border-0 shadow-sm">
      <Card.Header className="bg-light">
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <h5 className="mb-0">{title}</h5>
            {badge && <div>{badge}</div>}
          </div>
          <Button
            variant={isExpanded ? 'primary' : 'outline-primary'}
            size="sm"
            onClick={handleToggle}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? t('common.collapseSection', { section: title }) : t('common.expandSection', { section: title })}
          >
            {isExpanded ? `▼ ${t('common.collapse')}` : `▶ ${t('common.expand')}`}
          </Button>
        </div>
      </Card.Header>
      <Collapse in={isExpanded}>
        <div>
          <Card.Body>
            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">{t('common.loading')}</span>
                </div>
                <p className="mt-2 text-muted">{t('common.loadingData')}</p>
              </div>
            ) : (
              children
            )}
          </Card.Body>
        </div>
      </Collapse>
    </Card>
  );
};

export default ExpandableSection;
