'use client';

import React, { useRef, useEffect, useMemo, useCallback, memo } from 'react';
import ConversationItem, { ConversationItemData } from './ConversationItem';

interface ConversationListProps {
  conversations: ConversationItemData[];
  activeConversationId: string | null;
  onConversationSelect: (id: string) => void;
  onContextMenu?: (id: string, event: React.MouseEvent) => void;
  onLoadMore?: () => void;
}

interface GroupedConversations {
  today: ConversationItemData[];
  yesterday: ConversationItemData[];
  last7Days: ConversationItemData[];
  last30Days: ConversationItemData[];
  older: ConversationItemData[];
}

const ConversationListComponent: React.FC<ConversationListProps> = ({
  conversations,
  activeConversationId,
  onConversationSelect,
  onContextMenu,
  onLoadMore
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  // Memoize grouped conversations calculation
  const grouped = useMemo((): GroupedConversations => {
    const now = Date.now();
    const oneDayMs = 86400000;
    const sevenDaysMs = oneDayMs * 7;
    const thirtyDaysMs = oneDayMs * 30;

    const groups: GroupedConversations = {
      today: [],
      yesterday: [],
      last7Days: [],
      last30Days: [],
      older: []
    };

    conversations.forEach(item => {
      const age = now - item.timestamp;
      const startOfToday = new Date().setHours(0, 0, 0, 0);
      const startOfYesterday = startOfToday - oneDayMs;

      if (item.timestamp >= startOfToday) {
        groups.today.push(item);
      } else if (item.timestamp >= startOfYesterday) {
        groups.yesterday.push(item);
      } else if (age < sevenDaysMs) {
        groups.last7Days.push(item);
      } else if (age < thirtyDaysMs) {
        groups.last30Days.push(item);
      } else {
        groups.older.push(item);
      }
    });

    return groups;
  }, [conversations]);

  // Infinite scroll setup
  useEffect(() => {
    if (!onLoadMore) return;

    const trigger = loadMoreTriggerRef.current;
    if (!trigger) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(trigger);
    observerRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [onLoadMore]);

  // Memoize renderGroup function to avoid recreating on each render
  const renderGroup = useCallback((title: string, items: ConversationItemData[]) => {
    if (items.length === 0) return null;

    return (
      <div className="conversation-group" key={title}>
        <div className="conversation-group-header" role="heading" aria-level={2}>
          {title}
        </div>
        <div className="conversation-group-items" role="list">
          {items.map(conversation => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isActive={conversation.id === activeConversationId}
              onClick={onConversationSelect}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      </div>
    );
  }, [activeConversationId, onConversationSelect, onContextMenu]);

  if (conversations.length === 0) {
    return (
      <div className="conversation-list-empty" ref={listRef}>
        <div className="empty-state-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <p className="empty-state-text">No conversations yet</p>
        <p className="empty-state-hint">Start a new chat to begin</p>
      </div>
    );
  }

  // Use virtualization for large lists (>100 items)
  const shouldVirtualize = conversations.length > 100;

  return (
    <div
      className={`conversation-list ${shouldVirtualize ? 'virtualized' : ''}`}
      ref={listRef}
      role="navigation"
      aria-label="Conversation history"
    >
      {renderGroup('Today', grouped.today)}
      {renderGroup('Yesterday', grouped.yesterday)}
      {renderGroup('Last 7 days', grouped.last7Days)}
      {renderGroup('Last 30 days', grouped.last30Days)}
      {renderGroup('Older', grouped.older)}

      {/* Infinite scroll trigger */}
      {onLoadMore && (
        <div ref={loadMoreTriggerRef} className="load-more-trigger" aria-hidden="true" />
      )}
    </div>
  );
};

// Memoize ConversationList component
const ConversationList = memo(ConversationListComponent, (prevProps, nextProps) => {
  // Only re-render if these props change
  return (
    prevProps.conversations === nextProps.conversations &&
    prevProps.activeConversationId === nextProps.activeConversationId &&
    prevProps.onConversationSelect === nextProps.onConversationSelect &&
    prevProps.onContextMenu === nextProps.onContextMenu &&
    prevProps.onLoadMore === nextProps.onLoadMore
  );
});

ConversationList.displayName = 'ConversationList';

export default ConversationList;
