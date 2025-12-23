/**
 * conversationHelpers.ts
 *
 * Helper functions for conversation search, filtering, and grouping.
 * Provides utilities for time-based filtering, text search, and formatting.
 * Optimized for React 18+ with memoization-friendly pure functions.
 */

export type TimePeriod = 'all' | 'today' | 'week' | 'month';

export interface ConversationData {
  sessionId: string;
  title: string;
  previewText: string;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
  hasCitations: boolean;
}

// Cache for time period cutoffs (recalculated max once per minute)
let cutoffCache: {
  timestamp: number;
  today: number;
  yesterday: number;
  week: number;
  month: number;
} | null = null;

const CACHE_TTL = 60000; // 1 minute

/**
 * Get cached time cutoffs for filtering
 * Reduces unnecessary Date calculations
 */
function getTimeCutoffs() {
  const now = Date.now();

  if (cutoffCache && (now - cutoffCache.timestamp) < CACHE_TTL) {
    return cutoffCache;
  }

  const startOfToday = new Date().setHours(0, 0, 0, 0);

  cutoffCache = {
    timestamp: now,
    today: startOfToday,
    yesterday: startOfToday - (24 * 60 * 60 * 1000),
    week: now - (7 * 24 * 60 * 60 * 1000),
    month: now - (30 * 24 * 60 * 60 * 1000)
  };

  return cutoffCache;
}

/**
 * Filter conversations by time period
 * Optimized with cached time cutoffs
 * @param conversations - Array of conversations to filter
 * @param period - Time period to filter by
 * @returns Filtered array of conversations
 */
export function filterByTimePeriod(
  conversations: ConversationData[],
  period: TimePeriod
): ConversationData[] {
  if (period === 'all') return conversations;

  const cutoffs = getTimeCutoffs();
  let cutoffTime: number;

  switch (period) {
    case 'today':
      cutoffTime = cutoffs.today;
      break;
    case 'week':
      cutoffTime = cutoffs.week;
      break;
    case 'month':
      cutoffTime = cutoffs.month;
      break;
    default:
      return conversations;
  }

  return conversations.filter(conv => conv.updatedAt >= cutoffTime);
}

/**
 * Search through conversations by title and preview text
 * @param conversations - Array of conversations to search
 * @param query - Search query string
 * @returns Filtered array of conversations matching the query
 */
export function searchConversations(
  conversations: ConversationData[],
  query: string
): ConversationData[] {
  // Trim and normalize query
  const normalizedQuery = query.trim().toLowerCase();

  // Empty query returns all conversations
  if (!normalizedQuery) return conversations;

  // Escape special regex characters for safe search
  const escapedQuery = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Max query length validation (200 chars)
  const searchQuery = escapedQuery.slice(0, 200);

  return conversations.filter(conv => {
    // Search in title and preview text (case-insensitive)
    const titleMatch = conv.title.toLowerCase().includes(searchQuery);
    const previewMatch = conv.previewText.toLowerCase().includes(searchQuery);

    return titleMatch || previewMatch;
  });
}

/**
 * Group conversations by time periods (Today, Yesterday, Last 7 days, Last 30 days, Older)
 * @param conversations - Array of conversations to group
 * @returns Object with conversations grouped by time period
 */
export function groupByTime(conversations: ConversationData[]): {
  today: ConversationData[];
  yesterday: ConversationData[];
  lastWeek: ConversationData[];
  lastMonth: ConversationData[];
  older: ConversationData[];
} {
  const now = Date.now();
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const startOfYesterday = startOfToday - (24 * 60 * 60 * 1000);
  const startOfLastWeek = now - (7 * 24 * 60 * 60 * 1000);
  const startOfLastMonth = now - (30 * 24 * 60 * 60 * 1000);

  const groups = {
    today: [] as ConversationData[],
    yesterday: [] as ConversationData[],
    lastWeek: [] as ConversationData[],
    lastMonth: [] as ConversationData[],
    older: [] as ConversationData[]
  };

  conversations.forEach(conv => {
    if (conv.updatedAt >= startOfToday) {
      groups.today.push(conv);
    } else if (conv.updatedAt >= startOfYesterday) {
      groups.yesterday.push(conv);
    } else if (conv.updatedAt >= startOfLastWeek) {
      groups.lastWeek.push(conv);
    } else if (conv.updatedAt >= startOfLastMonth) {
      groups.lastMonth.push(conv);
    } else {
      groups.older.push(conv);
    }
  });

  return groups;
}

/**
 * Format timestamp as relative time
 * Examples: "2 hours ago", "Yesterday at 3:45 PM", "Jan 15 at 10:30 AM"
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted relative time string
 */
export function formatRelativeTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Less than 1 minute
  if (diffMins < 1) {
    return 'Just now';
  }

  // Less than 60 minutes - show minutes
  if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  }

  // Less than 24 hours - show hours
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  }

  // Yesterday - show "Yesterday at HH:MM AM/PM"
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const startOfYesterday = startOfToday - (24 * 60 * 60 * 1000);

  if (date.getTime() >= startOfYesterday && date.getTime() < startOfToday) {
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    return `Yesterday at ${timeStr}`;
  }

  // Less than 7 days - show day count
  if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }

  // Older than 7 days - show "MMM DD at HH:MM AM/PM"
  const dateStr = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  return `${dateStr} at ${timeStr}`;
}

/**
 * Get full timestamp for tooltip/title attribute
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted full timestamp string
 */
export function getFullTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Truncate conversation title for display
 * @param title - Conversation title
 * @param maxLength - Maximum length (default 60)
 * @returns Truncated title with ellipsis if needed
 */
export function truncateTitle(title: string, maxLength: number = 60): string {
  if (title.length <= maxLength) return title;
  return title.slice(0, maxLength) + '...';
}

/**
 * Generate conversation title from first user message
 * @param firstMessage - First user message content
 * @returns Truncated title (max 60 chars)
 */
export function generateConversationTitle(firstMessage: string): string {
  if (!firstMessage || !firstMessage.trim()) {
    return 'New Conversation';
  }

  // Remove extra whitespace and truncate
  const cleanedMessage = firstMessage.trim().replace(/\s+/g, ' ');
  return truncateTitle(cleanedMessage, 60);
}
