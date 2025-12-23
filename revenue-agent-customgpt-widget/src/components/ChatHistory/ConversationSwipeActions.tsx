'use client';

/**
 * ConversationSwipeActions Component
 *
 * Swipe-to-delete actions for conversation list items
 * Features:
 * - Swipe left reveals delete button (red)
 * - Partial swipe shows preview, full swipe commits
 * - Visual feedback during swipe (color change)
 * - Touch-friendly (40px minimum target size)
 * - Fallback to context menu on desktop
 * - Haptic feedback if supported (vibrate API)
 */

import React, { useState, useRef, useEffect } from 'react';
import { useSwipeProgress } from '@/hooks/useSwipeGesture';

interface ConversationSwipeActionsProps {
  conversationId: string;
  onDelete: (id: string) => void;
  children: React.ReactNode;
  className?: string;
}

const ConversationSwipeActions: React.FC<ConversationSwipeActionsProps> = ({
  conversationId,
  onDelete,
  children,
  className = '',
}) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const swipeProgress = useSwipeProgress();

  const SWIPE_THRESHOLD = 80; // Full swipe commits action
  const PARTIAL_SWIPE = 40; // Shows preview
  const DELETE_BUTTON_WIDTH = 80; // Width of delete button

  // Haptic feedback helper
  const triggerHaptic = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    swipeProgress.onTouchStart(e);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const distance = swipeProgress.onTouchMove(e);

    // Only allow left swipe (negative distance)
    if (distance < 0) {
      const clampedDistance = Math.max(distance, -DELETE_BUTTON_WIDTH);
      setSwipeOffset(clampedDistance);

      // Haptic feedback at threshold
      if (Math.abs(distance) === PARTIAL_SWIPE || Math.abs(distance) === SWIPE_THRESHOLD) {
        triggerHaptic();
      }
    }
  };

  const handleTouchEnd = () => {
    swipeProgress.onTouchEnd();

    // Check if swipe exceeds threshold
    if (Math.abs(swipeOffset) >= SWIPE_THRESHOLD) {
      // Commit delete action
      setIsDeleting(true);
      triggerHaptic();

      // Animate out and delete
      setTimeout(() => {
        onDelete(conversationId);
      }, 300);
    } else if (Math.abs(swipeOffset) >= PARTIAL_SWIPE) {
      // Snap to partial reveal
      setSwipeOffset(-DELETE_BUTTON_WIDTH);
    } else {
      // Snap back to original position
      setSwipeOffset(0);
    }
  };

  const handleDeleteClick = () => {
    setIsDeleting(true);
    triggerHaptic();
    setTimeout(() => {
      onDelete(conversationId);
    }, 300);
  };

  const handleCloseSwipe = () => {
    setSwipeOffset(0);
  };

  // Close swipe on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setSwipeOffset(0);
      }
    };

    if (swipeOffset !== 0) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [swipeOffset]);

  // Calculate background color based on swipe progress
  const getBackgroundColor = () => {
    const progress = Math.abs(swipeOffset) / SWIPE_THRESHOLD;
    if (progress >= 1) {
      return 'rgba(239, 68, 68, 1)'; // Full red
    } else if (progress >= 0.5) {
      return 'rgba(239, 68, 68, 0.8)'; // Medium red
    } else if (progress > 0) {
      return 'rgba(239, 68, 68, 0.4)'; // Light red
    }
    return 'transparent';
  };

  return (
    <div
      ref={containerRef}
      className={`conversation-swipe-container ${isDeleting ? 'deleting' : ''} ${className}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Delete Button Background */}
      <div
        className="swipe-action-background"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: `${DELETE_BUTTON_WIDTH}px`,
          background: getBackgroundColor(),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          transition: swipeOffset === 0 ? 'background 0.2s ease' : 'none',
        }}
      >
        <button
          onClick={handleDeleteClick}
          className="swipe-delete-button"
          aria-label="Delete conversation"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '40px',
            minHeight: '40px',
          }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
          </svg>
        </button>
      </div>

      {/* Main Content */}
      <div
        className="swipe-content"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: swipeOffset === 0 || Math.abs(swipeOffset) === DELETE_BUTTON_WIDTH
            ? 'transform 0.25s ease-out'
            : 'none',
          background: 'var(--bg-primary)',
        }}
      >
        {children}
      </div>

      {/* Click outside overlay to close */}
      {swipeOffset !== 0 && (
        <div
          onClick={handleCloseSwipe}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: -1,
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default ConversationSwipeActions;
