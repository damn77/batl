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

export function useBracketNavigation({
  initialScale = VIEWPORT_CONSTRAINTS.DEFAULT_SCALE,
  minScale = VIEWPORT_CONSTRAINTS.MIN_SCALE,
  maxScale = VIEWPORT_CONSTRAINTS.MAX_SCALE,
  zoomStep = VIEWPORT_CONSTRAINTS.ZOOM_STEP,
  containerRef
} = {}) {
  const [scale, setScale] = useState(initialScale);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const lastTranslateRef = useRef({ x: 0, y: 0 });
  const pinchStartDistanceRef = useRef(0);
  const pinchStartScaleRef = useRef(1);
  const isDraggingRef = useRef(false);
  const scaleRef = useRef(initialScale);
  const translateRef = useRef({ x: 0, y: 0 });

  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { translateRef.current = { x: translateX, y: translateY }; }, [translateX, translateY]);
  useEffect(() => { isDraggingRef.current = isDragging; }, [isDragging]);

  const clampScale = useCallback((newScale) => {
    return Math.min(maxScale, Math.max(minScale, newScale));
  }, [minScale, maxScale]);

  // Clamp translate so content fills viewport with no whitespace gaps.
  // When scaled content < viewport: center on that axis.
  // When scaled content > viewport: prevent dragging past edges.
  const clampTranslate = useCallback((tx, ty, s) => {
    const el = containerRef?.current;
    if (!el) return { x: tx, y: ty };

    const contentEl = el.querySelector('.bracket-viewport-content');
    if (!contentEl) return { x: tx, y: ty };

    const vpW = el.clientWidth;
    const vpH = el.clientHeight;
    const contentW = contentEl.scrollWidth * s;
    const contentH = contentEl.scrollHeight * s;

    let cx = tx, cy = ty;

    if (contentW <= vpW) {
      // Content fits horizontally — center it
      cx = (vpW - contentW) / 2;
    } else {
      // Content overflows — don't let edges pull away from viewport
      cx = Math.min(0, Math.max(vpW - contentW, cx));
    }

    if (contentH <= vpH) {
      // Content fits vertically — pin to top
      cy = 0;
    } else {
      cy = Math.min(0, Math.max(vpH - contentH, cy));
    }

    return { x: cx, y: cy };
  }, [containerRef]);

  const applyTransform = useCallback((newScale, tx, ty) => {
    const clamped = clampTranslate(tx, ty, newScale);
    setScale(newScale);
    setTranslateX(clamped.x);
    setTranslateY(clamped.y);
  }, [clampTranslate]);

  // Zoom centered on viewport middle, then clamp
  const zoomToCenter = useCallback((newScale) => {
    const el = containerRef?.current;
    if (!el) { setScale(newScale); return; }

    const rect = el.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const oldScale = scaleRef.current;
    const { x: tx, y: ty } = translateRef.current;

    const newTx = cx - (newScale / oldScale) * (cx - tx);
    const newTy = cy - (newScale / oldScale) * (cy - ty);

    applyTransform(newScale, newTx, newTy);
  }, [containerRef, applyTransform]);

  const zoomIn = useCallback(() => {
    zoomToCenter(clampScale(scaleRef.current + zoomStep));
  }, [clampScale, zoomStep, zoomToCenter]);

  const zoomOut = useCallback(() => {
    zoomToCenter(clampScale(scaleRef.current - zoomStep));
  }, [clampScale, zoomStep, zoomToCenter]);

  const reset = useCallback(() => {
    applyTransform(initialScale, 0, 0);
  }, [initialScale, applyTransform]);

  const panTo = useCallback((x, y) => {
    setTranslateX(x);
    setTranslateY(y);
  }, []);

  const centerOnElement = useCallback((elementId) => {
    if (!containerRef?.current) return;
    const element = containerRef.current.querySelector(`[data-match-id="${elementId}"]`);
    if (!element) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    const elementCenterX = elementRect.left - containerRect.left + elementRect.width / 2;
    const elementCenterY = elementRect.top - containerRect.top + elementRect.height / 2;

    const currentScale = scaleRef.current;
    const newTx = containerRect.width / 2 - elementCenterX * currentScale;
    const newTy = containerRect.height / 2 - elementCenterY * currentScale;

    setTranslateX(newTx);
    setTranslateY(newTy);
  }, [containerRef]);

  // Mouse drag handlers
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    lastTranslateRef.current = { x: translateRef.current.x, y: translateRef.current.y };
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

  // Imperative touch listeners with { passive: false }
  useEffect(() => {
    const el = containerRef?.current;
    if (!el) return;

    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        setIsDragging(true);
        dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        lastTranslateRef.current = { x: translateRef.current.x, y: translateRef.current.y };
      } else if (e.touches.length === 2) {
        const t1 = e.touches[0], t2 = e.touches[1];
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
        const t1 = e.touches[0], t2 = e.touches[1];
        const distance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const newScale = clampScale(pinchStartScaleRef.current * (distance / pinchStartDistanceRef.current));
        setScale(newScale);
      }
      e.preventDefault();
    };

    const onTouchEnd = () => { setIsDragging(false); };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [containerRef, clampScale]);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDraggingRef.current) setIsDragging(false);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;

  const containerStyle = {
    transform,
    transformOrigin: '0 0',
    transition: isDragging ? 'none' : 'transform 0.15s ease-out',
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return {
    scale, translateX, translateY, isDragging,
    zoomIn, zoomOut, reset, panTo, centerOnElement,
    handleMouseDown, handleMouseMove, handleMouseUp,
    transform, containerStyle,
    canZoomIn: scale < maxScale,
    canZoomOut: scale > minScale,
  };
}

export default useBracketNavigation;
