/**
 * useConversationHistory Hook
 *
 * React hook for managing conversation history with IndexedDB/localStorage persistence.
 * Provides:
 * - Paginated conversation loading
 * - Search functionality
 * - CRUD operations (create, read, update, delete)
 * - Automatic cleanup of old conversations
 * - Error handling and loading states
 * - Automatic fallback to localStorage if IndexedDB unavailable
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { MessageData } from '@/lib/ai/customgpt-client';
import {
  indexedDBStorage,
  isIndexedDBAvailable,
  type Conversation,
  type ConversationRecord,
} from '@/lib/storage/indexeddb';
import {
  localStorageFallback,
  isLocalStorageAvailable,
} from '@/lib/storage/localStorage-fallback';
import {
  sanitizeConversationTitle,
  sanitizePreviewText,
  validateSessionId,
  sanitizeSearchQuery,
} from '@/utils/sanitization';
import { useBroadcastChannel, type BroadcastMessage } from './useBroadcastChannel';

/**
 * Storage adapter interface
 */
interface StorageAdapter {
  save(record: ConversationRecord): Promise<void>;
  get(sessionId: string): Promise<ConversationRecord | null>;
  getAll(offset?: number, limit?: number): Promise<{ items: Conversation[]; hasMore: boolean; total: number }>;
  search(query: string): Promise<Conversation[]>;
  delete(sessionId: string): Promise<void>;
  restore(sessionId: string): Promise<void>;
  updateTitle(sessionId: string, title: string): Promise<void>;
  cleanup(): Promise<number>;
  getStats(): Promise<{ total: number; active: number; deleted: number; totalSize: number }>;
  clear(): Promise<void>;
  close(): void;
}

/**
 * Hook state
 */
interface ConversationHistoryState {
  conversations: Conversation[];
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  storageType: 'indexeddb' | 'localstorage' | 'none';
  isSyncing: boolean;
  lastSyncTime: number | null;
}

/**
 * Hook return type
 */
interface UseConversationHistoryReturn extends ConversationHistoryState {
  loadConversations: (offset?: number, limit?: number) => Promise<void>;
  loadMore: () => Promise<void>;
  searchConversations: (query: string) => Promise<void>;
  getConversation: (sessionId: string) => Promise<ConversationRecord | null>;
  saveConversation: (record: ConversationRecord) => Promise<void>;
  deleteConversation: (sessionId: string) => Promise<void>;
  restoreConversation: (sessionId: string) => Promise<void>;
  renameConversation: (sessionId: string, title: string) => Promise<void>;
  createConversation: (sessionId: string, messages: MessageData[]) => Promise<void>;
  runCleanup: () => Promise<number>;
  clearHistory: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Generate conversation metadata from messages
 */
function generateConversationMetadata(
  sessionId: string,
  messages: MessageData[],
  existingConversation?: Conversation
): Conversation {
  const now = Date.now();
  const firstMessage = messages[0];
  const lastMessage = messages[messages.length - 1];

  // Generate title from first user query with sanitization (max 200 chars, truncate display to 50)
  const rawTitle =
    existingConversation?.title ||
    (firstMessage?.user_query
      ? firstMessage.user_query.slice(0, 50) + (firstMessage.user_query.length > 50 ? '...' : '')
      : 'New Conversation');
  const title = sanitizeConversationTitle(rawTitle, 200);

  // Generate preview from last response with sanitization (max 100 chars)
  const rawPreview = lastMessage?.openai_response || '';
  const previewText = sanitizePreviewText(rawPreview, 100);

  // Check if any message has citations
  const hasCitations = messages.some((msg) => msg.citations && msg.citations.length > 0);

  return {
    sessionId,
    title,
    previewText,
    messageCount: messages.length,
    createdAt: existingConversation?.createdAt || now,
    updatedAt: now,
    hasCitations,
    isDeleted: existingConversation?.isDeleted,
    deletedAt: existingConversation?.deletedAt,
  };
}

/**
 * Hook for managing conversation history
 */
export function useConversationHistory(): UseConversationHistoryReturn {
  const [state, setState] = useState<ConversationHistoryState>({
    conversations: [],
    loading: false,
    hasMore: false,
    error: null,
    storageType: 'none',
    isSyncing: false,
    lastSyncTime: null,
  });

  const storageRef = useRef<StorageAdapter | null>(null);
  const offsetRef = useRef(0);
  const limitRef = useRef(20);

  // Cross-tab synchronization
  const { broadcast, subscribe } = useBroadcastChannel('conversation-history', {
    debounceMs: 100,
    deduplicate: true,
    deduplicationWindowMs: 1000,
  });

  /**
   * Handle incoming broadcast messages from other tabs
   */
  const handleBroadcastMessage = useCallback(
    async (message: BroadcastMessage<Conversation>) => {
      console.log('[ConversationHistory] Received broadcast:', message);

      setState((prev) => ({ ...prev, isSyncing: true }));

      try {
        switch (message.type) {
          case 'CREATE':
          case 'UPDATE':
            if (message.data && message.sessionId) {
              // Update or add conversation to local state
              setState((prev) => {
                const index = prev.conversations.findIndex((c) => c.sessionId === message.sessionId);
                const now = Date.now();

                // Conflict resolution: Last-write-wins based on timestamp
                if (index !== -1) {
                  const existing = prev.conversations[index];
                  // Only update if remote is newer
                  if (message.data!.updatedAt > existing.updatedAt) {
                    const updated = [...prev.conversations];
                    updated[index] = message.data!;
                    return {
                      ...prev,
                      conversations: updated,
                      lastSyncTime: now,
                    };
                  }
                } else {
                  // Add new conversation
                  return {
                    ...prev,
                    conversations: [message.data!, ...prev.conversations],
                    lastSyncTime: now,
                  };
                }

                return { ...prev, lastSyncTime: now };
              });
            }
            break;

          case 'DELETE':
            if (message.sessionId) {
              // Remove conversation from local state
              setState((prev) => ({
                ...prev,
                conversations: prev.conversations.filter((c) => c.sessionId !== message.sessionId),
                lastSyncTime: Date.now(),
              }));
            }
            break;

          case 'RENAME':
            if (message.sessionId && message.data?.title) {
              // Update conversation title
              setState((prev) => {
                const index = prev.conversations.findIndex((c) => c.sessionId === message.sessionId);
                if (index !== -1) {
                  const updated = [...prev.conversations];
                  // Conflict resolution: Last-write-wins
                  if (message.data!.updatedAt > updated[index].updatedAt) {
                    updated[index] = {
                      ...updated[index],
                      title: message.data!.title,
                      updatedAt: message.data!.updatedAt,
                    };
                    return {
                      ...prev,
                      conversations: updated,
                      lastSyncTime: Date.now(),
                    };
                  }
                }
                return { ...prev, lastSyncTime: Date.now() };
              });
            }
            break;

          case 'RESTORE':
            // Reload conversations to show restored conversation
            if (storageRef.current) {
              const result = await storageRef.current.getAll(0, limitRef.current);
              setState((prev) => ({
                ...prev,
                conversations: result.items,
                hasMore: result.hasMore,
                lastSyncTime: Date.now(),
              }));
            }
            break;

          case 'CLEAR':
            // Clear all conversations
            setState((prev) => ({
              ...prev,
              conversations: [],
              hasMore: false,
              lastSyncTime: Date.now(),
            }));
            break;
        }
      } catch (error) {
        console.error('[ConversationHistory] Failed to handle broadcast message:', error);
      } finally {
        setState((prev) => ({ ...prev, isSyncing: false }));
      }
    },
    []
  );

  /**
   * Subscribe to broadcast messages
   */
  useEffect(() => {
    return subscribe(handleBroadcastMessage);
  }, [subscribe, handleBroadcastMessage]);

  /**
   * Initialize storage adapter
   */
  useEffect(() => {
    let mounted = true;

    const initStorage = async () => {
      // Determine which storage to use
      if (isIndexedDBAvailable()) {
        storageRef.current = indexedDBStorage;
        setState((prev) => ({ ...prev, storageType: 'indexeddb' }));
      } else if (isLocalStorageAvailable()) {
        storageRef.current = localStorageFallback;
        setState((prev) => ({ ...prev, storageType: 'localstorage' }));
      } else {
        setState((prev) => ({
          ...prev,
          storageType: 'none',
          error: 'No storage available',
        }));
        return;
      }

      // Run cleanup on initialization
      if (storageRef.current) {
        try {
          await storageRef.current.cleanup();
        } catch (error) {
          console.error('[ConversationHistory] Cleanup failed:', error);
        }
      }

      // Auto-load conversations after storage is initialized
      if (mounted && storageRef.current) {
        try {
          setState((prev) => ({ ...prev, loading: true, error: null }));
          const result = await storageRef.current.getAll(0, 20);
          if (mounted) {
            setState((prev) => ({
              ...prev,
              conversations: result.items,
              hasMore: result.hasMore,
              loading: false,
            }));
            offsetRef.current = 0;
            limitRef.current = 20;
          }
        } catch (error) {
          console.error('[ConversationHistory] Failed to auto-load conversations:', error);
          if (mounted) {
            setState((prev) => ({
              ...prev,
              loading: false,
              error: error instanceof Error ? error.message : 'Failed to load conversations',
            }));
          }
        }
      }
    };

    initStorage();

    return () => {
      mounted = false;
      // Cleanup on unmount
      if (storageRef.current) {
        storageRef.current.close();
      }
    };
  }, []);

  /**
   * Load conversations with pagination
   */
  const loadConversations = useCallback(
    async (offset: number = 0, limit: number = 20) => {
      if (!storageRef.current) {
        setState((prev) => ({
          ...prev,
          error: 'Storage not available',
        }));
        return;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const result = await storageRef.current.getAll(offset, limit);

        setState((prev) => ({
          ...prev,
          conversations: offset === 0 ? result.items : [...prev.conversations, ...result.items],
          hasMore: result.hasMore,
          loading: false,
        }));

        offsetRef.current = offset;
        limitRef.current = limit;
      } catch (error) {
        console.error('[ConversationHistory] Failed to load conversations:', error);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load conversations',
        }));
      }
    },
    []
  );

  /**
   * Load more conversations (pagination)
   */
  const loadMore = useCallback(async () => {
    const newOffset = offsetRef.current + limitRef.current;
    await loadConversations(newOffset, limitRef.current);
  }, [loadConversations]);

  /**
   * Search conversations
   */
  const searchConversations = useCallback(async (query: string) => {
    if (!storageRef.current) {
      setState((prev) => ({
        ...prev,
        error: 'Storage not available',
      }));
      return;
    }

    // Sanitize search query
    const sanitizedQuery = sanitizeSearchQuery(query, 500);

    // Don't search if query is empty after sanitization
    if (!sanitizedQuery) {
      setState((prev) => ({
        ...prev,
        conversations: [],
        hasMore: false,
        loading: false,
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const results = await storageRef.current.search(sanitizedQuery);

      setState((prev) => ({
        ...prev,
        conversations: results,
        hasMore: false, // Search results are not paginated
        loading: false,
      }));

      offsetRef.current = 0;
    } catch (error) {
      console.error('[ConversationHistory] Search failed:', error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Search failed',
      }));
    }
  }, []);

  /**
   * Get a single conversation with messages
   */
  const getConversation = useCallback(async (sessionId: string): Promise<ConversationRecord | null> => {
    if (!storageRef.current) {
      throw new Error('Storage not available');
    }

    try {
      return await storageRef.current.get(sessionId);
    } catch (error) {
      console.error('[ConversationHistory] Failed to get conversation:', error);
      throw error;
    }
  }, []);

  /**
   * Save or update a conversation
   */
  const saveConversation = useCallback(async (record: ConversationRecord) => {
    if (!storageRef.current) {
      throw new Error('Storage not available');
    }

    try {
      await storageRef.current.save(record);

      // Update local state if conversation is in current list
      setState((prev) => {
        const index = prev.conversations.findIndex((c) => c.sessionId === record.sessionId);
        if (index !== -1) {
          const { messages, ...conversation } = record;
          const updated = [...prev.conversations];
          updated[index] = conversation;
          return { ...prev, conversations: updated };
        }
        return prev;
      });

      // Broadcast to other tabs
      const { messages, ...conversation } = record;
      broadcast('UPDATE', record.sessionId, conversation);
    } catch (error) {
      console.error('[ConversationHistory] Failed to save conversation:', error);
      throw error;
    }
  }, [broadcast]);

  /**
   * Delete a conversation (soft delete)
   */
  const deleteConversation = useCallback(async (sessionId: string) => {
    if (!storageRef.current) {
      throw new Error('Storage not available');
    }

    try {
      await storageRef.current.delete(sessionId);

      // Remove from local state
      setState((prev) => ({
        ...prev,
        conversations: prev.conversations.filter((c) => c.sessionId !== sessionId),
      }));

      // Broadcast to other tabs
      broadcast('DELETE', sessionId);
    } catch (error) {
      console.error('[ConversationHistory] Failed to delete conversation:', error);
      throw error;
    }
  }, [broadcast]);

  /**
   * Restore a deleted conversation
   */
  const restoreConversation = useCallback(async (sessionId: string) => {
    if (!storageRef.current) {
      throw new Error('Storage not available');
    }

    try {
      await storageRef.current.restore(sessionId);

      // Reload to show restored conversation
      await loadConversations(0, limitRef.current);

      // Broadcast to other tabs
      broadcast('RESTORE', sessionId);
    } catch (error) {
      console.error('[ConversationHistory] Failed to restore conversation:', error);
      throw error;
    }
  }, [loadConversations, broadcast]);

  /**
   * Rename a conversation
   */
  const renameConversation = useCallback(async (sessionId: string, title: string) => {
    if (!storageRef.current) {
      throw new Error('Storage not available');
    }

    // Validate session ID
    if (!validateSessionId(sessionId)) {
      throw new Error('Invalid session ID');
    }

    // Sanitize title input
    const sanitizedTitle = sanitizeConversationTitle(title, 200);

    try {
      await storageRef.current.updateTitle(sessionId, sanitizedTitle);

      const now = Date.now();

      // Update local state
      setState((prev) => {
        const index = prev.conversations.findIndex((c) => c.sessionId === sessionId);
        if (index !== -1) {
          const updated = [...prev.conversations];
          updated[index] = { ...updated[index], title: sanitizedTitle, updatedAt: now };
          return { ...prev, conversations: updated };
        }
        return prev;
      });

      // Broadcast to other tabs
      broadcast('RENAME', sessionId, { title: sanitizedTitle, updatedAt: now });
    } catch (error) {
      console.error('[ConversationHistory] Failed to rename conversation:', error);
      throw error;
    }
  }, [broadcast]);

  /**
   * Create a new conversation
   */
  const createConversation = useCallback(async (sessionId: string, messages: MessageData[]) => {
    if (!storageRef.current) {
      throw new Error('Storage not available');
    }

    try {
      const metadata = generateConversationMetadata(sessionId, messages);
      const record: ConversationRecord = {
        ...metadata,
        messages,
      };

      await storageRef.current.save(record);

      // Add to local state
      setState((prev) => ({
        ...prev,
        conversations: [metadata, ...prev.conversations],
      }));

      // Broadcast to other tabs
      broadcast('CREATE', sessionId, metadata);
    } catch (error) {
      console.error('[ConversationHistory] Failed to create conversation:', error);
      throw error;
    }
  }, [broadcast]);

  /**
   * Run cleanup of old conversations
   */
  const runCleanup = useCallback(async (): Promise<number> => {
    if (!storageRef.current) {
      throw new Error('Storage not available');
    }

    try {
      const count = await storageRef.current.cleanup();

      // Reload conversations after cleanup
      if (count > 0) {
        await loadConversations(0, limitRef.current);
      }

      return count;
    } catch (error) {
      console.error('[ConversationHistory] Cleanup failed:', error);
      throw error;
    }
  }, [loadConversations]);

  /**
   * Clear all conversation history
   */
  const clearHistory = useCallback(async () => {
    if (!storageRef.current) {
      throw new Error('Storage not available');
    }

    try {
      await storageRef.current.clear();

      setState((prev) => ({
        ...prev,
        conversations: [],
        hasMore: false,
      }));

      offsetRef.current = 0;

      // Broadcast to other tabs
      broadcast('CLEAR');
    } catch (error) {
      console.error('[ConversationHistory] Failed to clear history:', error);
      throw error;
    }
  }, [broadcast]);

  /**
   * Refresh conversation list
   */
  const refresh = useCallback(async () => {
    await loadConversations(0, limitRef.current);
  }, [loadConversations]);

  return {
    ...state,
    loadConversations,
    loadMore,
    searchConversations,
    getConversation,
    saveConversation,
    deleteConversation,
    restoreConversation,
    renameConversation,
    createConversation,
    runCleanup,
    clearHistory,
    refresh,
  };
}
