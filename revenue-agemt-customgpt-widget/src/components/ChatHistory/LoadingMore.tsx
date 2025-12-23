/**
 * LoadingMore Component
 *
 * Inline loading indicator for infinite scroll.
 * Shows at bottom of list while loading next batch.
 */

import React from 'react';
import './LoadingMore.css';

export default function LoadingMore() {
  return (
    <div className="chat-history-loading-more" aria-label="Loading more conversations">
      <div className="loading-more-spinner">
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
          <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
        </svg>
      </div>
      <span className="loading-more-text">Loading more...</span>
    </div>
  );
}
