// T040-T044: Tournament Rules Modal Component - Displays tournament rules in tabbed interface
import { Modal, Tab, Tabs, Row, Col, Accordion, Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import RuleComplexityIndicator from './RuleComplexityIndicator';
import { parseFormatConfig, parseScoringRules } from '../services/tournamentViewService';

// T041: Format Tab Content - defined outside to prevent recreation on each render
const FormatTab = ({ formatType, formatFields, t }) => (
  <div className="p-3">
    <h5 className="mb-3">{t('tournament.rules.formatTitle')}</h5>
    <p className="text-muted">
      {t('tournament.rules.formatDescription', { formatType })}
    </p>

    {formatFields.map((field, index) => (
      <Row key={index} className="mb-2">
        <Col xs={5} className="text-muted">
          {field.label}:
        </Col>
        <Col xs={7}>
          <strong>{field.value}</strong>
        </Col>
      </Row>
    ))}
  </div>
);

// T042: Scoring Tab Content - defined outside to prevent recreation on each render
const ScoringTab = ({ scoringFields, t }) => (
  <div className="p-3">
    <h5 className="mb-3">{t('tournament.rules.scoringTitle')}</h5>
    <p className="text-muted">
      {t('tournament.rules.scoringDescription')}
    </p>

    {scoringFields.map((field, index) => (
      <Row key={index} className="mb-2">
        <Col xs={5} className="text-muted">
          {field.label}:
        </Col>
        <Col xs={7}>
          <strong>{field.value}</strong>
        </Col>
      </Row>
    ))}
  </div>
);

// T043: Overrides Tab Content - defined outside to prevent recreation on each render
const OverridesTab = ({ ruleComplexity, t }) => {
  const hasOverrides = ruleComplexity !== 'DEFAULT';

  if (!hasOverrides) {
    return (
      <div className="p-3 text-center">
        <div className="py-5">
          <RuleComplexityIndicator complexity="DEFAULT" size="lg" />
          <p className="mt-3 text-muted">
            {t('tournament.rules.standardRules')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3">
      <h5 className="mb-3">{t('tabs.overrides')}</h5>
      <div className="alert alert-info">
        <div className="d-flex align-items-center gap-2 mb-2">
          <RuleComplexityIndicator complexity={ruleComplexity} />
          <strong>{t('tournament.rules.customOverrides')}</strong>
        </div>
        {ruleComplexity === 'MODIFIED' && (
          <p className="mb-0">
            {t('tournament.rules.modifiedDescription')}
          </p>
        )}
        {ruleComplexity === 'SPECIFIC' && (
          <p className="mb-0">
            {t('tournament.rules.specificDescription')}
          </p>
        )}
      </div>

      <p className="text-muted mt-3">
        <small>
          <strong>{t('common.note')}:</strong> {t('tournament.rules.overrideNote')}
        </small>
      </p>
    </div>
  );
};

/**
 * TournamentRulesModal - Modal popup displaying tournament rules
 * FR-003: Display tournament rules with complexity indicator
 *
 * @param {boolean} show - Whether modal is visible
 * @param {function} onHide - Callback to close modal
 * @param {Object} tournament - Tournament object with format and scoring rules
 */
const TournamentRulesModal = ({ show, onHide, tournament }) => {
  const { t } = useTranslation();

  if (!tournament) return null;

  // T046: Parse format configuration
  const formatFields = parseFormatConfig(tournament.formatType, tournament.formatConfig);

  // T047: Parse scoring rules
  const scoringFields = parseScoringRules(tournament.defaultScoringRules);

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center gap-3">
          <span>{t('tournament.rules.title')}</span>
          <RuleComplexityIndicator complexity={tournament.ruleComplexity} size="sm" />
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* T040: Tabbed Interface */}
        <Tabs defaultActiveKey="format" className="mb-3">
          <Tab eventKey="format" title={t('tabs.format')}>
            <FormatTab formatType={tournament.formatType} formatFields={formatFields} t={t} />
          </Tab>
          <Tab eventKey="scoring" title={t('tabs.scoring')}>
            <ScoringTab scoringFields={scoringFields} t={t} />
          </Tab>
          <Tab eventKey="overrides" title={t('tabs.overrides')}>
            <OverridesTab ruleComplexity={tournament.ruleComplexity} t={t} />
          </Tab>
        </Tabs>

        {/* T044: Show JSON Accordion */}
        <Accordion>
          <Accordion.Item eventKey="0">
            <Accordion.Header>
              <small className="text-muted">
                <Badge bg="secondary" className="me-2">
                  {t('common.advanced')}
                </Badge>
                {t('tournament.rules.showRawConfig')}
              </small>
            </Accordion.Header>
            <Accordion.Body>
              <div className="mb-3">
                <h6 className="text-muted">{t('tournament.rules.formatConfig')}</h6>
                <pre className="bg-light p-3 rounded" style={{ fontSize: '0.85rem', maxHeight: '200px', overflow: 'auto' }}>
                  {JSON.stringify(tournament.formatConfig, null, 2)}
                </pre>
              </div>

              <div>
                <h6 className="text-muted">{t('tournament.rules.scoringRules')}</h6>
                <pre className="bg-light p-3 rounded" style={{ fontSize: '0.85rem', maxHeight: '200px', overflow: 'auto' }}>
                  {JSON.stringify(tournament.defaultScoringRules, null, 2)}
                </pre>
              </div>
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      </Modal.Body>
      <Modal.Footer>
        <button className="btn btn-secondary" onClick={onHide}>
          {t('common.close')}
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export default TournamentRulesModal;
