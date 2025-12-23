/**
 * useConversationSync Hook
 *
 * Monitors ChatContainer DOM and syncs conversation metadata to storage.
 * This allows chat history tracking without modifying ChatContainer internals.
 *
 * Syncs to the new storage system (IndexedDB/localStorage) used by useConversationHistory.
 */

import { useEffect, useRef } from 'react';
import { loadConversation } from './useConversationPersistence';
import { indexedDBStorage, isIndexedDBAvailable, type ConversationRecord } from '@/lib/storage/indexeddb';
import { localStorageFallback, isLocalStorageAvailable } from '@/lib/storage/localStorage-fallback';

export function useConversationSync() {
  const lastMessageCountRef = useRef(0);
  const lastSessionIdRef = useRef<string | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const storageRef = useRef<any>(null);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize storage adapter
  useEffect(() => {
    if (isIndexedDBAvailable()) {
      storageRef.current = indexedDBStorage;
    } else if (isLocalStorageAvailable()) {
      storageRef.current = localStorageFallback;
    }
  }, []);

  useEffect(() => {
    // Reset mounted flag
    isMountedRef.current = true;

    // Auto-save interval (every 30 seconds)
    autoSaveIntervalRef.current = setInterval(async () => {
      if (isMountedRef.current) {
        await syncConversationState();
      }
    }, 30000);

    // Start monitoring for message changes
    const monitorMessages = () => {
      // Check if component is still mounted
      if (!isMountedRef.current) {
        return;
      }

      // Debounce to avoid excessive updates
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      syncTimeoutRef.current = setTimeout(async () => {
        // Check if component is still mounted before async operation
        if (!isMountedRef.current) {
          return;
        }
        await syncConversationState();
      }, 1000);
    };

    // Create MutationObserver to watch for DOM changes
    const observer = new MutationObserver(monitorMessages);

    // Find chat messages container with retry mechanism
    // ChatContainer might remount, so we need to find the element after it's rendered
    const attachObserver = (retryCount = 0) => {
      const messagesContainer = document.querySelector('.chat-messages');
      if (messagesContainer) {
        observer.observe(messagesContainer, {
          childList: true,
          subtree: true,
          characterData: true,
        });
        console.log('[ConversationSync] Observer attached to .chat-messages');

        // Initial sync
        monitorMessages();
      } else if (retryCount < 10 && isMountedRef.current) {
        // Retry after a short delay (ChatContainer might be mounting)
        console.log('[ConversationSync] .chat-messages not found, retrying...', retryCount + 1);
        setTimeout(() => attachObserver(retryCount + 1), 200);
      } else {
        console.warn('[ConversationSync] Could not find .chat-messages after retries');
      }
    };

    attachObserver();

    return () => {
      // Set mounted flag to false
      isMountedRef.current = false;

      // Disconnect observer
      observer.disconnect();

      // Clear timeouts
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }

      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
    };
  }, []);

  async function syncConversationState() {
    // Check if component is still mounted
    if (!isMountedRef.current) {
      return;
    }

    try {
      if (!storageRef.current) {
        console.log('[ConversationSync] Storage not available');
        return;
      }

      // Get current session from localStorage
      const stored = loadConversation();
      if (!stored?.sessionId) {
        console.log('[ConversationSync] No active session');
        return;
      }

      // Check mounted state after async operation
      if (!isMountedRef.current) {
        return;
      }

      const sessionId = stored.sessionId;

      // Detect session change - reset message count tracking
      const isNewSession = lastSessionIdRef.current !== sessionId;
      if (isNewSession) {
        console.log('[ConversationSync] New session detected:', sessionId, 'previous:', lastSessionIdRef.current);
        lastSessionIdRef.current = sessionId;
        lastMessageCountRef.current = 0; // Reset for new session
      }

      // Count messages in DOM (user + assistant pairs)
      const userMessages = document.querySelectorAll('.message.user .message-content');
      const assistantMessages = document.querySelectorAll('.message.assistant .message-content');
      const messageCount = Math.min(userMessages.length, assistantMessages.length);

      // Skip if no messages yet (but log it for debugging)
      if (messageCount === 0) {
        console.log('[ConversationSync] No complete message pairs to sync yet (user:', userMessages.length, ', assistant:', assistantMessages.length, ')');
        return;
      }

      // Skip if message count hasn't changed AND it's not a new session
      // For new sessions, always sync the first message
      if (messageCount === lastMessageCountRef.current && !isNewSession) {
        return;
      }

      lastMessageCountRef.current = messageCount;

      // Get first user message for title generation
      // Clone element and remove timestamp to get clean message text
      const firstMessageElement = userMessages[0];
      let firstMessageText = '';
      if (firstMessageElement) {
        const clone = firstMessageElement.cloneNode(true) as HTMLElement;
        const timestamp = clone.querySelector('.message-timestamp');
        if (timestamp) {
          timestamp.remove();
        }
        firstMessageText = clone.textContent?.trim() || '';
      }
      const title = firstMessageText.length > 50
        ? firstMessageText.substring(0, 50).trim() + '...'
        : firstMessageText.trim() || 'New Conversation';

      // Get last assistant message for preview
      // Clone element and remove timestamp to get clean message text
      const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];
      let previewText = '';
      if (lastAssistantMessage) {
        const clone = lastAssistantMessage.cloneNode(true) as HTMLElement;
        const timestamp = clone.querySelector('.message-timestamp');
        if (timestamp) {
          timestamp.remove();
        }
        previewText = clone.textContent?.trim().substring(0, 100) || '';
      }

      // Try to get existing conversation
      const existing = await storageRef.current.get(sessionId);

      // Check mounted state after async DB operation
      if (!isMountedRef.current) {
        return;
      }

      if (existing) {
        // Update existing conversation metadata
        console.log('[ConversationSync] Updating conversation:', sessionId);

        const updatedRecord: ConversationRecord = {
          ...existing,
          messageCount,
          previewText,
          updatedAt: Date.now(),
        };

        await storageRef.current.save(updatedRecord);
      } else {
        // Create new conversation entry
        console.log('[ConversationSync] Creating new conversation:', sessionId);

        const newRecord: ConversationRecord = {
          sessionId,
          title,
          previewText,
          messageCount,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          hasCitations: false, // Will be updated when citations are detected
          messages: [], // Messages will be populated when fetched from API
        };

        await storageRef.current.save(newRecord);
      }

      // Check mounted state after all async operations
      if (!isMountedRef.current) {
        return;
      }

      console.log('[ConversationSync] Synced conversation:', { sessionId, messageCount });

      // Broadcast update to other tabs
      if (typeof window !== 'undefined' && window.BroadcastChannel) {
        try {
          const channel = new BroadcastChannel('conversation_sync');
          channel.postMessage({
            type: 'conversation_updated',
            sessionId,
            messageCount,
            timestamp: Date.now(),
          });
          channel.close();
        } catch (error) {
          console.error('[ConversationSync] Failed to broadcast update:', error);
        }
      }
    } catch (error) {
      // Only log error if component is still mounted
      if (isMountedRef.current) {
        console.error('[ConversationSync] Failed to sync conversation:', error);
      }
    }
  }
}
