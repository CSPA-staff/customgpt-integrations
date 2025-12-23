/**
 * useSwipeGesture Hook
 *
 * Detects swipe gestures on touch-enabled devices
 * Features:
 * - Track touch start, move, end
 * - Calculate swipe distance and velocity
 * - Determine swipe direction (left/right)
 * - Configurable threshold (default 50px)
 * - Prevent conflicts with browser gestures
 */

import { useRef, useCallback, TouchEvent } from 'react';

interface SwipeGestureConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number; // Minimum distance to activate swipe (px)
  velocityThreshold?: number; // Minimum velocity (px/ms)
}

interface TouchPosition {
  x: number;
  y: number;
  time: number;
}

export const useSwipeGesture = ({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  velocityThreshold = 0.3,
}: SwipeGestureConfig) => {
  const touchStart = useRef<TouchPosition | null>(null);
  const touchEnd = useRef<TouchPosition | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    touchEnd.current = null;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    touchEnd.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart.current || !touchEnd.current) return;

    const deltaX = touchEnd.current.x - touchStart.current.x;
    const deltaY = touchEnd.current.y - touchStart.current.y;
    const deltaTime = touchEnd.current.time - touchStart.current.time;

    // Calculate velocity (px/ms)
    const velocity = Math.abs(deltaX) / deltaTime;

    // Determine if horizontal swipe (not vertical scroll)
    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);

    if (!isHorizontalSwipe) {
      touchStart.current = null;
      touchEnd.current = null;
      return;
    }

    // Check if swipe meets threshold requirements
    const meetsDistanceThreshold = Math.abs(deltaX) >= threshold;
    const meetsVelocityThreshold = velocity >= velocityThreshold;

    if (meetsDistanceThreshold || meetsVelocityThreshold) {
      if (deltaX > 0) {
        // Swipe right
        onSwipeRight?.();
      } else {
        // Swipe left
        onSwipeLeft?.();
      }
    }

    touchStart.current = null;
    touchEnd.current = null;
  }, [onSwipeLeft, onSwipeRight, threshold, velocityThreshold]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
};

/**
 * useSwipeProgress Hook
 *
 * Tracks swipe progress for visual feedback during gesture
 * Returns current swipe distance for animations
 */
export const useSwipeProgress = () => {
  const touchStart = useRef<TouchPosition | null>(null);
  const swipeDistance = useRef(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    swipeDistance.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStart.current) return 0;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;

    // Only update if horizontal swipe
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      swipeDistance.current = deltaX;
    }

    return swipeDistance.current;
  }, []);

  const handleTouchEnd = useCallback(() => {
    touchStart.current = null;
    swipeDistance.current = 0;
    return 0;
  }, []);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    getSwipeDistance: () => swipeDistance.current,
  };
};
