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

  // Refs for drag tracking (use refs for values needed in imperative listeners)
  const dragStartRef = useRef({ x: 0, y: 0 });
  const lastTranslateRef = useRef({ x: 0, y: 0 });
  const pinchStartDistanceRef = useRef(0);
  const pinchStartScaleRef = useRef(1);
  const isDraggingRef = useRef(false);
  const scaleRef = useRef(initialScale);
  const translateRef = useRef({ x: 0, y: 0 });

  // Keep refs in sync with state
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { translateRef.current = { x: translateX, y: translateY }; }, [translateX, translateY]);
  useEffect(() => { isDraggingRef.current = isDragging; }, [isDragging]);

  // Clamp scale to valid range
  const clampScale = useCallback((newScale) => {
    return Math.min(maxScale, Math.max(minScale, newScale));
  }, [minScale, maxScale]);

  // Zoom centered on viewport middle
  const zoomToCenter = useCallback((newScale) => {
    const el = containerRef?.current;
    if (!el) {
      setScale(newScale);
      return;
    }
    const rect = el.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const oldScale = scaleRef.current;
    const { x: tx, y: ty } = translateRef.current;

    // Adjust translate so the viewport center stays fixed
    const newTx = cx - (newScale / oldScale) * (cx - tx);
    const newTy = cy - (newScale / oldScale) * (cy - ty);

    setScale(newScale);
    setTranslateX(newTx);
    setTranslateY(newTy);
  }, [containerRef]);

  // Zoom in (T021)
  const zoomIn = useCallback(() => {
    const newScale = clampScale(scaleRef.current + zoomStep);
    zoomToCenter(newScale);
  }, [clampScale, zoomStep, zoomToCenter]);

  // Zoom out (T021)
  const zoomOut = useCallback(() => {
    const newScale = clampScale(scaleRef.current - zoomStep);
    zoomToCenter(newScale);
  }, [clampScale, zoomStep, zoomToCenter]);

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

    const currentScale = scaleRef.current;
    const newTranslateX = containerCenterX - elementCenterX * currentScale;
    const newTranslateY = containerCenterY - elementCenterY * currentScale;

    setTranslateX(newTranslateX);
    setTranslateY(newTranslateY);
  }, [containerRef]);

  // Mouse drag handlers (T024)
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return; // Only left mouse button

    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    lastTranslateRef.current = { x: translateRef.current.x, y: translateRef.current.y };

    // Prevent text selection during drag
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDraggingRef.current) return;

    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    setTranslateX(lastTranslateRef.current.x + deltaX);
    setTranslateY(lastTranslateRef.current.y + deltaY);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Attach touch listeners imperatively with { passive: false } so preventDefault works.
  // React 19 registers synthetic touch listeners as passive, making preventDefault a no-op.
  useEffect(() => {
    const el = containerRef?.current;
    if (!el) return;

    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        setIsDragging(true);
        dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        lastTranslateRef.current = { x: translateRef.current.x, y: translateRef.current.y };
      } else if (e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        pinchStartDistanceRef.current = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        pinchStartScaleRef.current = scaleRef.current;
      }
      e.preventDefault();
    };

    const onTouchMove = (e) => {
      if (e.touches.length === 1 && isDraggingRef.current) {
        const deltaX = e.touches[0].clientX - dragStartRef.current.x;
        const deltaY = e.touches[0].clientY - dragStartRef.current.y;
        setTranslateX(lastTranslateRef.current.x + deltaX);
        setTranslateY(lastTranslateRef.current.y + deltaY);
      } else if (e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const distance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const scaleChange = distance / pinchStartDistanceRef.current;
        const newScale = clampScale(pinchStartScaleRef.current * scaleChange);
        setScale(newScale);
      }
      e.preventDefault();
    };

    const onTouchEnd = () => {
      setIsDragging(false);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [containerRef, clampScale]);

  // Add global mouse up handler to handle drag release outside container
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDraggingRef.current) {
        setIsDragging(false);
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

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

    // Event handlers (mouse only — touch is attached imperatively)
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,

    // Computed values
    transform,
    containerStyle,

    // Utilities
    canZoomIn: scale < maxScale,
    canZoomOut: scale > minScale,
  };
}

export default useBracketNavigation;
