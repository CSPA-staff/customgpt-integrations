'use client';

import React, { useState, useCallback, useMemo, memo } from 'react';
import { generateAriaLabel, formatAccessibleDate } from '@/utils/a11y';

export interface ConversationItemData {
  id: string;
  title: string;
  timestamp: number;
  messageCount: number;
}

interface ConversationItemProps {
  conversation: ConversationItemData;
  isActive: boolean;
  onClick: (id: string) => void;
  onContextMenu?: (id: string, event: React.MouseEvent) => void;
}

const ConversationItemComponent: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onClick,
  onContextMenu
}) => {
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Memoize timestamp formatting
  const formattedTimestamp = useMemo(() => {
    const date = new Date(conversation.timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, [conversation.timestamp]);

  // Memoize title truncation
  const truncatedTitle = useMemo(() => {
    const maxLength = 60;
    if (conversation.title.length <= maxLength) return conversation.title;
    return conversation.title.slice(0, maxLength) + '...';
  }, [conversation.title]);

  // Memoize click handler
  const handleClick = useCallback(() => {
    onClick(conversation.id);
  }, [onClick, conversation.id]);

  // Memoize context menu handler
  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    if (onContextMenu) {
      onContextMenu(conversation.id, event);
    }
  }, [onContextMenu, conversation.id]);

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    setTouchStartX(event.touches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    if (touchStartX !== null) {
      const touchEndX = event.changedTouches[0].clientX;
      const swipeDistance = touchEndX - touchStartX;

      // Swipe left threshold (placeholder for future swipe gestures)
      if (Math.abs(swipeDistance) > 50) {
        // TODO: Implement swipe action
      }

      setTouchStartX(null);
    }
  }, [touchStartX]);

  // Memoize ARIA label
  const ariaLabel = useMemo(() => generateAriaLabel({
    title: conversation.title,
    timestamp: new Date(conversation.timestamp).toISOString(),
    messageCount: conversation.messageCount,
    isActive,
  }), [conversation.title, conversation.timestamp, conversation.messageCount, isActive]);

  // Memoize accessible date
  const accessibleDate = useMemo(() =>
    formatAccessibleDate(new Date(conversation.timestamp)),
    [conversation.timestamp]
  );

  // Memoize keyboard handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  // Memoize context menu button click handler
  const handleContextMenuButton = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (onContextMenu) {
      onContextMenu(conversation.id, e);
    }
  }, [onContextMenu, conversation.id]);

  return (
    <div
      className={`conversation-item ${isActive ? 'active' : ''}`}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="listitem"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-current={isActive ? 'true' : undefined}
      onKeyDown={handleKeyDown}
    >
      <div className="conversation-item-content">
        <div className="conversation-title" aria-hidden="true">
          {truncatedTitle}
        </div>
        <div className="conversation-metadata" aria-hidden="true">
          <span className="conversation-timestamp">
            {formattedTimestamp}
          </span>
          <span className="conversation-message-count">
            {conversation.messageCount} {conversation.messageCount === 1 ? 'message' : 'messages'}
          </span>
        </div>
      </div>
      <button
        className="conversation-context-menu-button"
        onClick={handleContextMenuButton}
        aria-label={`More options for conversation: ${conversation.title}`}
        aria-haspopup="menu"
        title="More options"
      >
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          width="16"
          height="16"
          aria-hidden="true"
        >
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>
      <span className="sr-only">{accessibleDate}</span>
    </div>
  );
};

// Memoize component with custom comparison function
const ConversationItem = memo(ConversationItemComponent, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.conversation.id === nextProps.conversation.id &&
    prevProps.conversation.title === nextProps.conversation.title &&
    prevProps.conversation.timestamp === nextProps.conversation.timestamp &&
    prevProps.conversation.messageCount === nextProps.conversation.messageCount &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.onClick === nextProps.onClick &&
    prevProps.onContextMenu === nextProps.onContextMenu
  );
});

ConversationItem.displayName = 'ConversationItem';

export default ConversationItem;
