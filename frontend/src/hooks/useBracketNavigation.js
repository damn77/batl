/**
 * useBracketNavigation Hook
 * Feature: 011-knockout-bracket-view
 * T019-T031: Viewport state management for zoom/pan navigation
 *
 * FR-010: Zoom in/out (0.25x - 4.0x range)
 * FR-011: Pan/drag to navigate large brackets
 * FR-012: Reset button to restore default view
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { VIEWPORT_CONSTRAINTS } from '../utils/bracketUtils';

/**
 * Custom hook for bracket viewport navigation
 *
 * @param {Object} options - Configuration options
 * @param {number} options.initialScale - Initial zoom scale (default 1.0)
 * @param {number} options.minScale - Minimum zoom scale (default 0.25)
 * @param {number} options.maxScale - Maximum zoom scale (default 4.0)
 * @param {number} options.zoomStep - Zoom increment per step (default 0.25)
 * @param {React.RefObject} options.containerRef - Ref to the bracket container element
 * @returns {Object} Navigation state and handlers
 */
export function useBracketNavigation({
  initialScale = VIEWPORT_CONSTRAINTS.DEFAULT_SCALE,
  minScale = VIEWPORT_CONSTRAINTS.MIN_SCALE,
  maxScale = VIEWPORT_CONSTRAINTS.MAX_SCALE,
  zoomStep = VIEWPORT_CONSTRAINTS.ZOOM_STEP,
  containerRef
} = {}) {
  // Viewport state
  const [scale, setScale] = useState(initialScale);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Refs for drag tracking
  const dragStartRef = useRef({ x: 0, y: 0 });
  const lastTranslateRef = useRef({ x: 0, y: 0 });
  const pinchStartDistanceRef = useRef(0);
  const pinchStartScaleRef = useRef(1);

  // Clamp scale to valid range
  const clampScale = useCallback((newScale) => {
    return Math.min(maxScale, Math.max(minScale, newScale));
  }, [minScale, maxScale]);

  // Zoom in (T021)
  const zoomIn = useCallback(() => {
    setScale(prev => clampScale(prev + zoomStep));
  }, [clampScale, zoomStep]);

  // Zoom out (T021)
  const zoomOut = useCallback(() => {
    setScale(prev => clampScale(prev - zoomStep));
  }, [clampScale, zoomStep]);

  // Reset to default view (T027, FR-012)
  const reset = useCallback(() => {
    setScale(initialScale);
    setTranslateX(0);
    setTranslateY(0);
  }, [initialScale]);

  // Pan to specific coordinates (T022)
  const panTo = useCallback((x, y) => {
    setTranslateX(x);
    setTranslateY(y);
  }, []);

  // Center viewport on a specific element (T043, for My Match)
  const centerOnElement = useCallback((elementId) => {
    if (!containerRef?.current) return;

    const element = containerRef.current.querySelector(`[data-match-id="${elementId}"]`);
    if (!element) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    // Calculate element's position relative to container
    const elementCenterX = elementRect.left - containerRect.left + elementRect.width / 2;
    const elementCenterY = elementRect.top - containerRect.top + elementRect.height / 2;

    // Calculate translation to center the element
    const containerCenterX = containerRect.width / 2;
    const containerCenterY = containerRect.height / 2;

    const newTranslateX = containerCenterX - elementCenterX * scale;
    const newTranslateY = containerCenterY - elementCenterY * scale;

    setTranslateX(newTranslateX);
    setTranslateY(newTranslateY);
  }, [containerRef, scale]);

  // Mouse drag handlers (T024)
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return; // Only left mouse button

    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    lastTranslateRef.current = { x: translateX, y: translateY };

    // Prevent text selection during drag
    e.preventDefault();
  }, [translateX, translateY]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    setTranslateX(lastTranslateRef.current.x + deltaX);
    setTranslateY(lastTranslateRef.current.y + deltaY);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch handlers for mobile (T025, T026)
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 1) {
      // Single touch - pan
      setIsDragging(true);
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lastTranslateRef.current = { x: translateX, y: translateY };
    } else if (e.touches.length === 2) {
      // Two fingers - pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      pinchStartDistanceRef.current = distance;
      pinchStartScaleRef.current = scale;
    }
  }, [translateX, translateY, scale]);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 1 && isDragging) {
      // Single touch - pan
      const deltaX = e.touches[0].clientX - dragStartRef.current.x;
      const deltaY = e.touches[0].clientY - dragStartRef.current.y;

      setTranslateX(lastTranslateRef.current.x + deltaX);
      setTranslateY(lastTranslateRef.current.y + deltaY);
    } else if (e.touches.length === 2) {
      // Two fingers - pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );

      const scaleChange = distance / pinchStartDistanceRef.current;
      const newScale = clampScale(pinchStartScaleRef.current * scaleChange);
      setScale(newScale);
    }

    e.preventDefault();
  }, [isDragging, clampScale]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global mouse up handler to handle drag release outside container
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchend', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [isDragging]);

  // Generate CSS transform string
  const transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;

  // Container style object for convenience
  const containerStyle = {
    transform,
    transformOrigin: '0 0',
    transition: isDragging ? 'none' : 'transform 0.15s ease-out',
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return {
    // Current state
    scale,
    translateX,
    translateY,
    isDragging,

    // Actions
    zoomIn,
    zoomOut,
    reset,
    panTo,
    centerOnElement,

    // Event handlers
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,

    // Computed values
    transform,
    containerStyle,

    // Utilities
    canZoomIn: scale < maxScale,
    canZoomOut: scale > minScale,
  };
}

export default useBracketNavigation;
