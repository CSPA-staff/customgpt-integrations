/**
 * useBroadcastChannel Hook
 *
 * Real-time cross-tab synchronization using BroadcastChannel API
 * with automatic fallback to localStorage events for older browsers.
 *
 * Features:
 * - Browser-native BroadcastChannel API (Chrome 54+, Firefox 38+, Edge 79+)
 * - Automatic fallback to localStorage events for compatibility
 * - Type-safe message handling with TypeScript
 * - Automatic cleanup on unmount
 * - Debouncing to prevent message spam
 * - Message deduplication to avoid update loops
 */

import { useRef, useEffect, useCallback } from 'react';

/**
 * Supported broadcast message types
 */
export type BroadcastMessageType = 'CREATE' | 'UPDATE' | 'DELETE' | 'RENAME' | 'RESTORE' | 'CLEAR';

/**
 * Broadcast message structure
 */
export interface BroadcastMessage<T = any> {
  type: BroadcastMessageType;
  sessionId?: string;
  data?: T;
  timestamp: number;
  tabId: string; // Unique tab identifier to prevent self-messaging
}

/**
 * Message handler callback type
 */
export type MessageHandler<T = any> = (message: BroadcastMessage<T>) => void;

/**
 * Hook options
 */
export interface UseBroadcastChannelOptions {
  /**
   * Debounce delay in milliseconds (default: 100)
   * Prevents message spam by batching rapid updates
   */
  debounceMs?: number;

  /**
   * Enable automatic deduplication (default: true)
   * Prevents processing duplicate messages within a time window
   */
  deduplicate?: boolean;

  /**
   * Deduplication window in milliseconds (default: 1000)
   */
  deduplicationWindowMs?: number;
}

/**
 * Hook return type
 */
export interface UseBroadcastChannelReturn {
  /**
   * Broadcast a message to other tabs
   */
  broadcast: <T = any>(type: BroadcastMessageType, sessionId?: string, data?: T) => void;

  /**
   * Subscribe to incoming messages
   */
  subscribe: (handler: MessageHandler) => () => void;

  /**
   * Check if BroadcastChannel is supported
   */
  isSupported: boolean;

  /**
   * Check if using fallback mode (localStorage)
   */
  isFallback: boolean;
}

/**
 * Generate unique tab ID for message deduplication
 */
function generateTabId(): string {
  return `tab_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Hook for cross-tab communication
 *
 * @param channelName - Unique channel name for this communication channel
 * @param options - Hook configuration options
 * @returns Broadcast channel interface
 *
 * @example
 * ```tsx
 * const { broadcast, subscribe } = useBroadcastChannel('conversations');
 *
 * // Subscribe to messages
 * useEffect(() => {
 *   return subscribe((message) => {
 *     console.log('Received:', message);
 *   });
 * }, [subscribe]);
 *
 * // Broadcast a message
 * broadcast('UPDATE', sessionId, conversationData);
 * ```
 */
export function useBroadcastChannel(
  channelName: string,
  options: UseBroadcastChannelOptions = {}
): UseBroadcastChannelReturn {
  const {
    debounceMs = 100,
    deduplicate = true,
    deduplicationWindowMs = 1000,
  } = options;

  // Unique tab identifier
  const tabIdRef = useRef(generateTabId());

  // BroadcastChannel or localStorage reference
  const channelRef = useRef<BroadcastChannel | null>(null);
  const isBroadcastChannelSupported = useRef(false);

  // Message handlers
  const handlersRef = useRef<Set<MessageHandler>>(new Set());

  // Debounce timer
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingMessageRef = useRef<BroadcastMessage | null>(null);

  // Message deduplication cache
  const messageHashesRef = useRef<Map<string, number>>(new Map());

  /**
   * Check if BroadcastChannel is supported
   */
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      isBroadcastChannelSupported.current = true;

      try {
        channelRef.current = new BroadcastChannel(channelName);
      } catch (error) {
        console.warn('[BroadcastChannel] Failed to create channel, using localStorage fallback:', error);
        isBroadcastChannelSupported.current = false;
      }
    } else {
      isBroadcastChannelSupported.current = false;
    }

    return () => {
      // Cleanup
      if (channelRef.current) {
        channelRef.current.close();
        channelRef.current = null;
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [channelName]);

  /**
   * Generate message hash for deduplication
   */
  const getMessageHash = useCallback((message: BroadcastMessage): string => {
    return `${message.type}_${message.sessionId || 'global'}_${message.timestamp}`;
  }, []);

  /**
   * Check if message is duplicate
   */
  const isDuplicate = useCallback(
    (message: BroadcastMessage): boolean => {
      if (!deduplicate) return false;

      const hash = getMessageHash(message);
      const lastSeen = messageHashesRef.current.get(hash);

      if (lastSeen && Date.now() - lastSeen < deduplicationWindowMs) {
        return true;
      }

      // Store hash with current timestamp
      messageHashesRef.current.set(hash, Date.now());

      // Clean up old hashes
      const now = Date.now();
      for (const [key, timestamp] of messageHashesRef.current.entries()) {
        if (now - timestamp > deduplicationWindowMs) {
          messageHashesRef.current.delete(key);
        }
      }

      return false;
    },
    [deduplicate, deduplicationWindowMs, getMessageHash]
  );

  /**
   * Handle incoming message
   */
  const handleMessage = useCallback(
    (message: BroadcastMessage) => {
      // Ignore messages from self
      if (message.tabId === tabIdRef.current) {
        return;
      }

      // Check for duplicates
      if (isDuplicate(message)) {
        return;
      }

      // Notify all handlers
      handlersRef.current.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error('[BroadcastChannel] Handler error:', error);
        }
      });
    },
    [isDuplicate]
  );

  /**
   * Setup message listeners
   */
  useEffect(() => {
    if (isBroadcastChannelSupported.current && channelRef.current) {
      // BroadcastChannel listener
      const listener = (event: MessageEvent) => {
        handleMessage(event.data as BroadcastMessage);
      };

      channelRef.current.addEventListener('message', listener);

      return () => {
        channelRef.current?.removeEventListener('message', listener);
      };
    } else if (typeof window !== 'undefined') {
      // localStorage fallback listener
      const listener = (event: StorageEvent) => {
        if (event.key === `broadcast_${channelName}` && event.newValue) {
          try {
            const message = JSON.parse(event.newValue) as BroadcastMessage;
            handleMessage(message);
          } catch (error) {
            console.error('[BroadcastChannel] Failed to parse localStorage message:', error);
          }
        }
      };

      window.addEventListener('storage', listener);

      return () => {
        window.removeEventListener('storage', listener);
      };
    }
  }, [channelName, handleMessage]);

  /**
   * Broadcast a message to other tabs
   */
  const broadcast = useCallback(
    <T = any>(type: BroadcastMessageType, sessionId?: string, data?: T) => {
      const message: BroadcastMessage<T> = {
        type,
        sessionId,
        data,
        timestamp: Date.now(),
        tabId: tabIdRef.current,
      };

      // Store pending message
      pendingMessageRef.current = message;

      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Debounce broadcast
      debounceTimerRef.current = setTimeout(() => {
        const messageToSend = pendingMessageRef.current;
        if (!messageToSend) return;

        try {
          if (isBroadcastChannelSupported.current && channelRef.current) {
            // Use BroadcastChannel
            channelRef.current.postMessage(messageToSend);
          } else if (typeof window !== 'undefined') {
            // Use localStorage fallback
            // localStorage events only fire on OTHER tabs, not the current one
            localStorage.setItem(`broadcast_${channelName}`, JSON.stringify(messageToSend));

            // Clean up localStorage immediately to prevent stale data
            setTimeout(() => {
              localStorage.removeItem(`broadcast_${channelName}`);
            }, 100);
          }
        } catch (error) {
          console.error('[BroadcastChannel] Failed to broadcast message:', error);
        }

        pendingMessageRef.current = null;
        debounceTimerRef.current = null;
      }, debounceMs);
    },
    [channelName, debounceMs]
  );

  /**
   * Subscribe to incoming messages
   */
  const subscribe = useCallback((handler: MessageHandler): (() => void) => {
    handlersRef.current.add(handler);

    // Return unsubscribe function
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  return {
    broadcast,
    subscribe,
    isSupported: isBroadcastChannelSupported.current,
    isFallback: !isBroadcastChannelSupported.current,
  };
}
