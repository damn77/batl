/**
 * BracketControls Component
 * Feature: 011-knockout-bracket-view
 * T020, T027, T028: Zoom, pan, and toggle controls for bracket navigation
 *
 * FR-010: Zoom in/out buttons
 * FR-012: Reset button to restore default view
 * FR-008: Toggle BYE visibility button
 */

import PropTypes from 'prop-types';
import { Button, ButtonGroup } from 'react-bootstrap';
import { bracketColors as defaultColors } from '../config/bracketColors';

/**
 * BracketControls Component
 *
 * Provides zoom, reset, and BYE toggle controls for the knockout bracket.
 *
 * @param {Object} props - Component props
 * @param {number} props.scale - Current zoom scale
 * @param {Function} props.onZoomIn - Zoom in handler
 * @param {Function} props.onZoomOut - Zoom out handler
 * @param {Function} props.onReset - Reset view handler
 * @param {Function} props.onToggleByes - Toggle BYE visibility handler
 * @param {boolean} props.showByes - Current BYE visibility state
 * @param {boolean} props.hasByes - Whether tournament has first-round BYEs
 * @param {Object} props.colors - Color configuration
 * @param {boolean} props.disabled - Disable all controls
 * @param {boolean} props.canZoomIn - Whether zoom in is available
 * @param {boolean} props.canZoomOut - Whether zoom out is available
 * @param {string} props.className - Additional CSS class
 */
const BracketControls = ({
  scale,
  onZoomIn,
  onZoomOut,
  onReset,
  onToggleByes,
  showByes,
  hasByes,
  colors: _colors = defaultColors,
  disabled = false,
  canZoomIn = true,
  canZoomOut = true,
  className = ''
}) => {
  // Format scale as percentage
  const scalePercent = Math.round(scale * 100);

  return (
    <div className={`bracket-controls d-flex gap-2 align-items-center ${className}`.trim()}>
      {/* Zoom controls */}
      <ButtonGroup size="sm">
        <Button
          variant="outline-secondary"
          onClick={onZoomOut}
          disabled={disabled || !canZoomOut}
          title="Zoom Out (scale down)"
          aria-label="Zoom out"
        >
          <span aria-hidden="true">-</span>
        </Button>

        <Button
          variant="outline-secondary"
          disabled
          style={{ minWidth: '60px', cursor: 'default' }}
          title={`Current zoom: ${scalePercent}%`}
          aria-label={`Zoom level: ${scalePercent}%`}
        >
          {scalePercent}%
        </Button>

        <Button
          variant="outline-secondary"
          onClick={onZoomIn}
          disabled={disabled || !canZoomIn}
          title="Zoom In (scale up)"
          aria-label="Zoom in"
        >
          <span aria-hidden="true">+</span>
        </Button>
      </ButtonGroup>

      {/* Reset button (FR-012) */}
      <Button
        variant="outline-primary"
        size="sm"
        onClick={onReset}
        disabled={disabled}
        title="Reset view to default zoom and position"
        aria-label="Reset view"
      >
        <span aria-hidden="true">{'\u21BA'}</span>
      </Button>

      {/* BYE toggle button (FR-008) - only shown if tournament has BYEs */}
      {hasByes && (
        <Button
          variant={showByes ? 'warning' : 'outline-warning'}
          size="sm"
          onClick={onToggleByes}
          disabled={disabled}
          title={showByes ? 'Hide first-round BYE matches' : 'Show first-round BYE matches'}
          aria-label={showByes ? 'Hide BYEs' : 'Show BYEs'}
          aria-pressed={showByes}
        >
          <span aria-hidden="true">{showByes ? '\uD83D\uDC41' : '\uD83D\uDC41\uFE0F'}</span>
        </Button>
      )}
    </div>
  );
};

BracketControls.propTypes = {
  scale: PropTypes.number.isRequired,
  onZoomIn: PropTypes.func.isRequired,
  onZoomOut: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  onToggleByes: PropTypes.func.isRequired,
  showByes: PropTypes.bool.isRequired,
  hasByes: PropTypes.bool.isRequired,
  colors: PropTypes.object,
  disabled: PropTypes.bool,
  canZoomIn: PropTypes.bool,
  canZoomOut: PropTypes.bool,
  className: PropTypes.string
};

export default BracketControls;
