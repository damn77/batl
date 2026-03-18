// T087: Combined Format Display Component - Orchestrates Group Stage + Knockout Phase
// Phase 30-04: Wired with advancement flow (preview modal, post-advancement layout, revert panel)
import { useState } from 'react';
import { Alert, Badge, Button, Accordion, ProgressBar, Spinner, Modal } from 'react-bootstrap';
import GroupStandingsTable from './GroupStandingsTable';
import KnockoutBracket from './KnockoutBracket';
import AdvancementPreviewModal from './AdvancementPreviewModal';
import { getAdvancementPreview, revertAdvancement } from '../services/advancementService';

/**
 * CombinedFormatDisplay - Displays both group stage and knockout phase
 * Used for COMBINED format tournaments
 *
 * @param {string} tournamentId - Tournament UUID
 * @param {Object} tournament - Full tournament object (status, category, defaultScoringRules)
 * @param {Array} groups - Array of group objects from format structure
 * @param {Array} brackets - Array of bracket objects from format structure
 * @param {Array} rounds - Array of round objects from format structure
 * @param {boolean} isOrganizer - Whether current user is an organizer/admin
 * @param {string|null} currentUserPlayerId - Current user's player profile ID (for My Match)
 * @param {Object|null} scoringRules - Scoring rules { formatType, winningSets, winningTiebreaks }
 * @param {boolean} groupsComplete - Whether all group matches are COMPLETED or CANCELLED
 * @param {Array|null} allMatches - All matches for per-group progress bar computation
 */
const CombinedFormatDisplay = ({
  tournamentId,
  tournament,
  groups,
  brackets,
  rounds,
  isOrganizer = false,
  currentUserPlayerId = null,
  scoringRules = null,
  groupsComplete = false,
  allMatches = null,
}) => {
  // Advancement preview state
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  // Revert state
  const [showRevertModal, setShowRevertModal] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [revertError, setRevertError] = useState(null);

  // Separate rounds by phase (knockout rounds for bracket display)
  const knockoutRounds = rounds?.filter(r => r.phase === 'KNOCKOUT') || [];

  // Determine advancement state
  const hasBrackets = brackets && brackets.length > 0;
  const hasKnockoutResults = hasBrackets &&
    (allMatches?.some(m => m.bracketId && m.status === 'COMPLETED') || false);

  // Compute completion percentage for a single group
  const computeGroupCompletionPct = (matchesArray, groupId) => {
    if (!matchesArray) return 0;
    const groupMatches = matchesArray.filter(m => m.groupId === groupId);
    if (groupMatches.length === 0) return 0;
    const completed = groupMatches.filter(m => m.status === 'COMPLETED' || m.status === 'CANCELLED').length;
    return Math.round((completed / groupMatches.length) * 100);
  };

  // Handle "Generate Knockout Bracket" button click — load preview, open modal
  const handleGenerateClick = async () => {
    setLoadingPreview(true);
    setPreviewError(null);
    try {
      const preview = await getAdvancementPreview(tournamentId);
      setPreviewData(preview);
      setShowPreview(true);
    } catch (err) {
      setPreviewError(err.message || 'Could not load advancement preview. Please try again.');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Handle revert confirmation
  const handleRevert = async () => {
    setReverting(true);
    setRevertError(null);
    try {
      await revertAdvancement(tournamentId);
      setShowRevertModal(false);
      window.location.reload();
    } catch (err) {
      setRevertError(err.message || 'Revert failed. Please try again.');
    } finally {
      setReverting(false);
    }
  };

  // Handle advancement complete — reload page to show brackets
  const handleAdvancementComplete = () => {
    window.location.reload();
  };

  return (
    <div>
      {/* Group completion banner — organizer sees this when all group matches done and no bracket */}
      {isOrganizer && groupsComplete && !hasBrackets && (
        <>
          {previewError && (
            <Alert variant="danger" className="mb-4">
              <small>{previewError}</small>
            </Alert>
          )}
          <Alert variant="success" className="d-flex justify-content-between align-items-center mb-4">
            <span><strong>Group stage complete</strong> — Ready to generate knockout bracket</span>
            <Button
              variant="primary"
              size="sm"
              onClick={handleGenerateClick}
              disabled={loadingPreview}
            >
              {loadingPreview ? (
                <>
                  <Spinner as="span" animation="border" size="sm" className="me-2" />
                  Loading...
                </>
              ) : (
                'Generate Knockout Bracket'
              )}
            </Button>
          </Alert>
        </>
      )}

      {/* Group Stage Section */}
      <div className="mb-5">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">Group Stage</h6>
          {groups && <Badge bg="primary">{groups.length} groups</Badge>}
        </div>

        {groups && groups.length > 0 ? (
          <Accordion defaultActiveKey={hasBrackets ? null : (tournament?.status === 'IN_PROGRESS' ? groups[0]?.id : null)}>
            {groups.map(group => (
              <Accordion.Item key={group.id} eventKey={group.id}>
                <Accordion.Header>
                  <div style={{ flexGrow: 1, marginRight: '1rem' }}>
                    <div className="d-flex align-items-center gap-2">
                      <span className="fw-bold">{group.name || `Group ${group.groupNumber}`}</span>
                      <span className="badge bg-secondary">
                        {group.pairs?.length > 0
                          ? `${group.pairs.length} pairs`
                          : `${group.players?.length || 0} players`}
                      </span>
                      {hasBrackets && <Badge bg="secondary">Read-only</Badge>}
                    </div>
                    <ProgressBar
                      now={computeGroupCompletionPct(allMatches, group.id)}
                      variant="success"
                      style={{ height: '4px', marginTop: '4px' }}
                    />
                  </div>
                </Accordion.Header>
                <Accordion.Body>
                  <GroupStandingsTable
                    tournamentId={tournamentId}
                    group={group}
                    isOrganizer={isOrganizer}
                    currentUserPlayerId={currentUserPlayerId}
                    scoringRules={scoringRules}
                    tournamentStatus={tournament?.status}
                  />
                </Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        ) : (
          <Alert variant="info">Group stage not yet configured.</Alert>
        )}
      </div>

      {/* Knockout Phase Section */}
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">Knockout Phase</h6>
          {brackets && <Badge bg="primary">{brackets.length} bracket(s)</Badge>}
        </div>

        {hasBrackets ? (
          <div className="d-flex flex-column gap-4">
            {brackets.map(bracket => {
              const bracketRounds = knockoutRounds.filter(r => r.bracketId === bracket.id);
              return (
                <div key={bracket.id}>
                  <h6 className="fw-bold mb-2">
                    {bracket.placementRange || (bracket.bracketType === 'SECONDARY' ? 'Secondary Bracket' : 'Main Bracket')}
                  </h6>
                  <KnockoutBracket
                    tournamentId={tournamentId}
                    bracket={bracket}
                    rounds={bracketRounds}
                    currentUserPlayerId={currentUserPlayerId}
                    tournamentStatus={tournament?.status}
                    isDoubles={tournament?.category?.type === 'DOUBLES'}
                    scoringRules={scoringRules}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <Alert variant="info">
            Knockout bracket will appear after group stage completes.
          </Alert>
        )}
      </div>

      {/* Revert panel — visible when brackets exist and no knockout match results yet */}
      {isOrganizer && hasBrackets && !hasKnockoutResults && (
        <Alert variant="warning" className="mt-4 d-flex justify-content-between align-items-center">
          <span>Undo advancement to edit group results.</span>
          <Button variant="outline-danger" size="sm" onClick={() => setShowRevertModal(true)}>
            Revert Advancement
          </Button>
        </Alert>
      )}

      {/* Revert confirmation modal */}
      <Modal show={showRevertModal} onHide={() => setShowRevertModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Revert Advancement</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          This will delete all knockout brackets and unlock group results for editing.
        </Modal.Body>
        <Modal.Footer>
          {revertError && (
            <Alert variant="danger" className="w-100 mb-2">
              <small>{revertError}</small>
            </Alert>
          )}
          <Button variant="outline-secondary" onClick={() => setShowRevertModal(false)} disabled={reverting}>
            Keep Brackets
          </Button>
          <Button variant="danger" onClick={handleRevert} disabled={reverting}>
            {reverting ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-2" />
                Reverting...
              </>
            ) : (
              'Revert Advancement'
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Advancement Preview Modal */}
      <AdvancementPreviewModal
        show={showPreview}
        onHide={() => setShowPreview(false)}
        preview={previewData}
        tournamentId={tournamentId}
        onAdvancementComplete={handleAdvancementComplete}
        isDoubles={tournament?.category?.type === 'DOUBLES'}
      />
    </div>
  );
};

export default CombinedFormatDisplay;
