/**
 * Usage Example for Infinite Scroll Components
 *
 * This file demonstrates how to integrate:
 * - useInfiniteScroll hook
 * - LoadingState (skeleton screen)
 * - EmptyState (no conversations)
 * - LoadingMore (inline loader)
 */

import React, { useState, useEffect } from 'react';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import LoadingState from './LoadingState';
import EmptyState from './EmptyState';
import LoadingMore from './LoadingMore';

// Example conversation type
interface Conversation {
  id: string;
  title: string;
  preview: string;
  timestamp: number;
}

// Constants
const BATCH_SIZE = 20;

export default function ChatHistoryExample() {
  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Simulated API call to load conversations
  const loadConversations = async (offset: number, limit: number): Promise<Conversation[]> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Simulate fetching from IndexedDB or API
    const mockConversations: Conversation[] = Array.from({ length: limit }, (_, i) => ({
      id: `conv-${offset + i}`,
      title: `Conversation ${offset + i + 1}`,
      preview: `This is a preview of conversation ${offset + i + 1}`,
      timestamp: Date.now() - (offset + i) * 3600000 // 1 hour apart
    }));

    // Simulate end of data after 60 items
    if (offset >= 60) {
      return [];
    }

    return mockConversations;
  };

  // Initial load
  useEffect(() => {
    const initLoad = async () => {
      setIsInitialLoading(true);
      try {
        const initialBatch = await loadConversations(0, BATCH_SIZE);
        setConversations(initialBatch);
        setTotalLoaded(BATCH_SIZE);
        setHasMore(initialBatch.length === BATCH_SIZE);
      } catch (error) {
        console.error('Failed to load conversations:', error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    initLoad();
  }, []);

  // Load more handler for infinite scroll
  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const nextBatch = await loadConversations(totalLoaded, BATCH_SIZE);

      if (nextBatch.length === 0) {
        setHasMore(false);
      } else {
        setConversations(prev => [...prev, ...nextBatch]);
        setTotalLoaded(prev => prev + nextBatch.length);
        setHasMore(nextBatch.length === BATCH_SIZE);
      }
    } catch (error) {
      console.error('Failed to load more conversations:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Infinite scroll hook
  const { ref: sentinelRef } = useInfiniteScroll({
    loadMore: handleLoadMore,
    hasMore,
    isLoading: isLoadingMore,
    threshold: 250,
    reverseScroll: false // Set to true for reverse scroll (scroll UP loads older)
  });

  // New chat handler
  const handleNewChat = () => {
    console.log('Create new chat');
    // Implement new chat creation logic
  };

  // Clear search handler
  const handleClearSearch = () => {
    setSearchQuery('');
    // Implement search clear logic
  };

  // Loading state (initial load)
  if (isInitialLoading) {
    return <LoadingState />;
  }

  // Empty state (no conversations)
  if (conversations.length === 0 && !searchQuery) {
    return (
      <EmptyState
        type="no-conversations"
        onNewChat={handleNewChat}
      />
    );
  }

  // Empty state (no search results)
  if (conversations.length === 0 && searchQuery) {
    return (
      <EmptyState
        type="no-search-results"
        searchQuery={searchQuery}
        onClearSearch={handleClearSearch}
      />
    );
  }

  // Main render with infinite scroll
  return (
    <div className="chat-history-container">
      {/* Conversation list */}
      <div className="conversation-list">
        {conversations.map((conversation) => (
          <div key={conversation.id} className="conversation-item">
            <h3>{conversation.title}</h3>
            <p>{conversation.preview}</p>
            <span>{new Date(conversation.timestamp).toLocaleDateString()}</span>
          </div>
        ))}

        {/* Inline loading indicator */}
        {isLoadingMore && <LoadingMore />}

        {/* Sentinel element for infinite scroll */}
        {hasMore && !isLoadingMore && <div ref={sentinelRef} style={{ height: 1 }} />}

        {/* End of list indicator */}
        {!hasMore && conversations.length > 0 && (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
            No more conversations
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Integration Notes:
 *
 * 1. Initial Load:
 *    - Show <LoadingState /> during first fetch
 *    - Automatically loads first BATCH_SIZE items
 *
 * 2. Infinite Scroll:
 *    - Attach sentinelRef to invisible element at bottom
 *    - When sentinel becomes visible, loadMore is called
 *    - Show <LoadingMore /> during fetch
 *    - Append new items to existing list
 *
 * 3. Empty States:
 *    - no-conversations: No items at all
 *    - no-search-results: Search returned no results
 *    - all-deleted: All conversations were deleted
 *
 * 4. Performance:
 *    - IntersectionObserver is efficient (no scroll event listeners)
 *    - Proper cleanup on unmount
 *    - < 300ms to load next batch (from requirements)
 *    - No UI jank during scroll
 *
 * 5. Accessibility:
 *    - aria-label on loading states
 *    - Screen reader friendly
 *    - Keyboard navigation support
 */
