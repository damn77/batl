// T040-T044: Tournament Rules Modal Component - Displays tournament rules in tabbed interface
import { Modal, Tab, Tabs, Row, Col, Accordion, Badge } from 'react-bootstrap';
import RuleComplexityIndicator from './RuleComplexityIndicator';
import { parseFormatConfig, parseScoringRules } from '../services/tournamentViewService';

/**
 * TournamentRulesModal - Modal popup displaying tournament rules
 * FR-003: Display tournament rules with complexity indicator
 *
 * @param {boolean} show - Whether modal is visible
 * @param {function} onHide - Callback to close modal
 * @param {Object} tournament - Tournament object with format and scoring rules
 */
const TournamentRulesModal = ({ show, onHide, tournament }) => {
  if (!tournament) return null;

  // T046: Parse format configuration
  const formatFields = parseFormatConfig(tournament.formatType, tournament.formatConfig);

  // T047: Parse scoring rules
  const scoringFields = parseScoringRules(tournament.defaultScoringRules);

  // T041: Format Tab Content
  const FormatTab = () => (
    <div className="p-3">
      <h5 className="mb-3">Tournament Format Configuration</h5>
      <p className="text-muted">
        This tournament uses a <strong>{tournament.formatType}</strong> format.
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

  // T042: Scoring Tab Content
  const ScoringTab = () => (
    <div className="p-3">
      <h5 className="mb-3">Match Scoring Rules</h5>
      <p className="text-muted">
        Default scoring rules applied to all matches unless overridden.
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

  // T043: Overrides Tab Content
  const OverridesTab = () => {
    const hasOverrides = tournament.ruleComplexity !== 'DEFAULT';

    if (!hasOverrides) {
      return (
        <div className="p-3 text-center">
          <div className="py-5">
            <RuleComplexityIndicator complexity="DEFAULT" size="lg" />
            <p className="mt-3 text-muted">
              This tournament uses standard rules throughout.
              <br />
              No group, round, or match-specific overrides have been configured.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-3">
        <h5 className="mb-3">Rule Overrides</h5>
        <div className="alert alert-info">
          <div className="d-flex align-items-center gap-2 mb-2">
            <RuleComplexityIndicator complexity={tournament.ruleComplexity} />
            <strong>This tournament has custom rule overrides</strong>
          </div>
          {tournament.ruleComplexity === 'MODIFIED' && (
            <p className="mb-0">
              Rule changes have been configured at the group or round level.
              Different parts of the tournament may use different rules.
            </p>
          )}
          {tournament.ruleComplexity === 'SPECIFIC' && (
            <p className="mb-0">
              Rule changes have been configured for specific matches.
              Individual matches may use customized rules beyond the standard configuration.
            </p>
          )}
        </div>

        <p className="text-muted mt-3">
          <small>
            <strong>Note:</strong> Detailed override information is available through the tournament
            management interface. Contact the tournament organizer for specific rule variations.
          </small>
        </p>
      </div>
    );
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center gap-3">
          <span>Tournament Rules</span>
          <RuleComplexityIndicator complexity={tournament.ruleComplexity} size="sm" />
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* T040: Tabbed Interface */}
        <Tabs defaultActiveKey="format" className="mb-3">
          <Tab eventKey="format" title="Format">
            <FormatTab />
          </Tab>
          <Tab eventKey="scoring" title="Scoring">
            <ScoringTab />
          </Tab>
          <Tab eventKey="overrides" title="Overrides">
            <OverridesTab />
          </Tab>
        </Tabs>

        {/* T044: Show JSON Accordion */}
        <Accordion>
          <Accordion.Item eventKey="0">
            <Accordion.Header>
              <small className="text-muted">
                <Badge bg="secondary" className="me-2">
                  Advanced
                </Badge>
                Show Raw Configuration (JSON)
              </small>
            </Accordion.Header>
            <Accordion.Body>
              <div className="mb-3">
                <h6 className="text-muted">Format Configuration</h6>
                <pre className="bg-light p-3 rounded" style={{ fontSize: '0.85rem', maxHeight: '200px', overflow: 'auto' }}>
                  {JSON.stringify(tournament.formatConfig, null, 2)}
                </pre>
              </div>

              <div>
                <h6 className="text-muted">Scoring Rules</h6>
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
          Close
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export default TournamentRulesModal;
