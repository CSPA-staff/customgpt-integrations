/**
 * useConversationSearch Hook
 *
 * Manages search and filter logic for conversation history.
 * Combines text search with time-based filtering using AND operation.
 * Optimized with React 18 concurrent features (useDeferredValue).
 */

import { useMemo, useDeferredValue } from 'react';
import { searchConversations, filterByTimePeriod, TimePeriod, ConversationData } from '@/utils/conversationHelpers';

interface UseConversationSearchProps {
  conversations: ConversationData[];
  searchQuery: string;
  timePeriod: TimePeriod;
}

interface UseConversationSearchResult {
  filteredConversations: ConversationData[];
  resultCount: number;
  hasActiveFilters: boolean;
  isPending: boolean;
}

/**
 * Hook for searching and filtering conversations
 * Combines search query and time period filters with AND operation
 */
export function useConversationSearch({
  conversations,
  searchQuery,
  timePeriod
}: UseConversationSearchProps): UseConversationSearchResult {
  // Defer search query to keep UI responsive during typing
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const deferredTimePeriod = useDeferredValue(timePeriod);

  // Track if deferred values are behind current values
  const isPending = deferredSearchQuery !== searchQuery || deferredTimePeriod !== timePeriod;

  // Memoize filtered results to avoid unnecessary recalculations
  const filteredConversations = useMemo(() => {
    // Step 1: Apply search filter
    let results = searchConversations(conversations, deferredSearchQuery);

    // Step 2: Apply time period filter (AND operation)
    results = filterByTimePeriod(results, deferredTimePeriod);

    // Sort by updatedAt (most recent first)
    return results.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [conversations, deferredSearchQuery, deferredTimePeriod]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return deferredSearchQuery.trim() !== '' || deferredTimePeriod !== 'all';
  }, [deferredSearchQuery, deferredTimePeriod]);

  return {
    filteredConversations,
    resultCount: filteredConversations.length,
    hasActiveFilters,
    isPending
  };
}
