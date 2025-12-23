/**
 * LoadingState Component
 *
 * Skeleton screen for chat history initial load.
 * Shows 5 placeholder conversation items with shimmer animation.
 */

import React from 'react';
import './LoadingState.css';

export default function LoadingState() {
  return (
    <div className="chat-history-loading-state" aria-label="Loading conversations">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="skeleton-conversation-item">
          <div className="skeleton-avatar" />
          <div className="skeleton-content">
            <div className="skeleton-title" />
            <div className="skeleton-preview" />
            <div className="skeleton-timestamp" />
          </div>
        </div>
      ))}
    </div>
  );
}
