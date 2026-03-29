// Phase 30: Advancement Preview Modal — waterfall preview with confirmation button
import { useState } from 'react';
import { Modal, Table, Badge, Button, Alert, Spinner } from 'react-bootstrap';
import { confirmAdvancement } from '../services/advancementService';

/**
 * AdvancementPreviewModal - Shows waterfall preview and confirmation button
 *
 * @param {boolean} show - Whether modal is visible
 * @param {Function} onHide - Close modal callback
 * @param {Object} preview - Preview data from getAdvancementPreview
 * @param {string} tournamentId - Tournament UUID
 * @param {Function} onAdvancementComplete - Callback after successful advancement
 * @param {boolean} isDoubles - Whether this is a doubles tournament
 */
function AdvancementPreviewModal({ show, onHide, preview, tournamentId, onAdvancementComplete, isDoubles = false }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const handleConfirm = async () => {
    setGenerating(true);
    setError(null);
    try {
      await confirmAdvancement(tournamentId);
      onHide();
      if (onAdvancementComplete) onAdvancementComplete();
    } catch (err) {
      setError(err.message || 'Bracket generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  if (!preview) return null;

  const { mainSlots, secondarySlots, eliminated, mainBracketInfo, secondaryBracketInfo } = preview;

  // Helper to render entity name (singles = name, doubles = pair name)
  const entityName = (entity) => entity?.name || 'Unknown';

  return (
    <Modal show={show} onHide={onHide} size="lg" fullscreen="sm-down" centered>
      <Modal.Header closeButton>
        <Modal.Title>Advancement Preview</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <h6 className="fw-bold mb-3">Bracket Assignments</h6>
        <Table striped hover size="sm">
          <thead>
            <tr>
              <th>{isDoubles ? 'Pair' : 'Player'}</th>
              <th>Group</th>
              <th>Position</th>
              <th>Bracket</th>
            </tr>
          </thead>
          <tbody>
            {/* Main Bracket rows */}
            {mainSlots?.map((slot, i) => (
              <tr key={`main-${i}`}>
                <td>{entityName(slot.entity)}</td>
                <td>Group {slot.groupNumber}</td>
                <td>{slot.position}</td>
                <td>
                  Main Bracket
                  {slot.isSpillover && <Badge bg="info" className="ms-2">Spillover</Badge>}
                </td>
              </tr>
            ))}
            {/* Secondary Bracket rows */}
            {secondarySlots?.length > 0 && secondarySlots.map((slot, i) => (
              <tr key={`secondary-${i}`}>
                <td>{entityName(slot.entity)}</td>
                <td>Group {slot.groupNumber}</td>
                <td>{slot.position}</td>
                <td>
                  Secondary Bracket
                  {slot.isSpillover && <Badge bg="info" className="ms-2">Spillover</Badge>}
                </td>
              </tr>
            ))}
            {/* Eliminated section */}
            {eliminated?.length > 0 && (
              <>
                <tr>
                  <td colSpan={4} className="text-muted fst-italic fw-bold pt-3">Eliminated</td>
                </tr>
                {eliminated.map((slot, i) => (
                  <tr key={`elim-${i}`} className="text-muted fst-italic">
                    <td>{entityName(slot.entity)}</td>
                    <td>Group {slot.groupNumber}</td>
                    <td>{slot.position}</td>
                    <td>—</td>
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </Table>

        {/* Bracket summary */}
        <Alert variant="info" className="mb-0">
          <small>
            Main Bracket: {mainBracketInfo?.playerCount ?? mainSlots?.length} players ({mainBracketInfo?.byes ?? 0} byes)
            {secondaryBracketInfo && secondarySlots?.length > 0 && (
              <>. Secondary Bracket: {secondaryBracketInfo.playerCount ?? secondarySlots?.length} players ({secondaryBracketInfo.byes ?? 0} byes)</>
            )}
          </small>
        </Alert>
      </Modal.Body>
      <Modal.Footer>
        {error && (
          <Alert variant="danger" className="w-100 mb-2">
            <small>{error}</small>
          </Alert>
        )}
        <Button variant="outline-secondary" onClick={onHide} disabled={generating}>
          Close Preview
        </Button>
        <Button variant="primary" onClick={handleConfirm} disabled={generating}>
          {generating ? (
            <>
              <Spinner as="span" animation="border" size="sm" className="me-2" />
              Generating...
            </>
          ) : (
            'Confirm & Generate Brackets'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default AdvancementPreviewModal;
