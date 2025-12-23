/**
 * EmptyState Component
 *
 * Displays different states for empty chat history:
 * - No conversations at all
 * - No search results
 * - All conversations deleted
 */

import React from 'react';
import './EmptyState.css';

export type EmptyStateType = 'no-conversations' | 'no-search-results' | 'all-deleted';

export interface EmptyStateProps {
  /** Type of empty state to display */
  type?: EmptyStateType;
  /** Callback when "New Chat" is clicked */
  onNewChat?: () => void;
  /** Callback when "Clear search" is clicked */
  onClearSearch?: () => void;
  /** Search query for "no-search-results" type */
  searchQuery?: string;
}

export default function EmptyState({
  type = 'no-conversations',
  onNewChat,
  onClearSearch,
  searchQuery
}: EmptyStateProps) {
  const renderContent = () => {
    switch (type) {
      case 'no-search-results':
        return (
          <>
            <div className="empty-state-icon">
              <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                <path d="M7 9h5v1H7z" opacity="0.5"/>
              </svg>
            </div>
            <h2 className="empty-state-title">No conversations found</h2>
            <p className="empty-state-description">
              {searchQuery ? (
                <>No results for &quot;{searchQuery}&quot;</>
              ) : (
                <>Try a different search term</>
              )}
            </p>
            {onClearSearch && (
              <button className="empty-state-button secondary" onClick={onClearSearch}>
                Clear search
              </button>
            )}
          </>
        );

      case 'all-deleted':
        return (
          <>
            <div className="empty-state-icon">
              <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" opacity="0.3"/>
              </svg>
            </div>
            <h2 className="empty-state-title">All conversations deleted</h2>
            <p className="empty-state-description">
              Your conversation history has been cleared
            </p>
            {onNewChat && (
              <button className="empty-state-button primary" onClick={onNewChat}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                <span>New Chat</span>
              </button>
            )}
          </>
        );

      case 'no-conversations':
      default:
        return (
          <>
            <div className="empty-state-icon">
              <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" opacity="0.3"/>
                <circle cx="12" cy="10" r="1.5"/>
                <circle cx="8" cy="10" r="1.5"/>
                <circle cx="16" cy="10" r="1.5"/>
              </svg>
            </div>
            <h2 className="empty-state-title">Start your first conversation</h2>
            <p className="empty-state-description">
              Your conversation history will appear here
            </p>
            {onNewChat && (
              <button className="empty-state-button primary" onClick={onNewChat}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                <span>New Chat</span>
              </button>
            )}
          </>
        );
    }
  };

  return (
    <div className="chat-history-empty-state">
      {renderContent()}
    </div>
  );
}
