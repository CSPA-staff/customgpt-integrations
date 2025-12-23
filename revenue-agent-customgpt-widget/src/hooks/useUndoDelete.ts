/**
 * useUndoDelete Hook
 *
 * Manages soft delete with undo functionality.
 * Queues permanent deletion after timeout, can be cancelled.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { permanentDeleteConversation } from '@/lib/conversationStorage';

const UNDO_TIMEOUT = 5000; // 5 seconds

interface PendingDelete {
  conversationId: string;
  conversationTitle: string;
  timeoutId: NodeJS.Timeout;
}

interface UseUndoDeleteResult {
  pendingDelete: PendingDelete | null;
  timeRemaining: number;
  scheduleDelete: (conversationId: string, conversationTitle: string, onPermanentDelete: (id: string) => void) => void;
  cancelDelete: (onRestore: (id: string) => Promise<void>) => Promise<void>;
}

export function useUndoDelete(): UseUndoDeleteResult {
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  /**
   * Schedule a conversation for permanent deletion
   */
  const scheduleDelete = useCallback(
    (conversationId: string, conversationTitle: string, onPermanentDelete: (id: string) => void) => {
      // Clear any existing pending delete
      if (pendingDelete) {
        clearTimeout(pendingDelete.timeoutId);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }

      // Record start time
      startTimeRef.current = Date.now();
      setTimeRemaining(UNDO_TIMEOUT);

      // Schedule permanent deletion
      const timeoutId = setTimeout(async () => {
        try {
          await permanentDeleteConversation(conversationId);
          console.log('[UndoDelete] Permanently deleted conversation:', conversationId);
          onPermanentDelete(conversationId);
        } catch (err) {
          console.error('[UndoDelete] Failed to permanently delete:', err);
        } finally {
          setPendingDelete(null);
          setTimeRemaining(0);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      }, UNDO_TIMEOUT);

      // Update time remaining every 100ms
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = Math.max(0, UNDO_TIMEOUT - elapsed);
        setTimeRemaining(remaining);

        if (remaining === 0 && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }, 100);

      setPendingDelete({
        conversationId,
        conversationTitle,
        timeoutId,
      });
    },
    [pendingDelete]
  );

  /**
   * Cancel pending deletion and restore conversation
   */
  const cancelDelete = useCallback(
    async (onRestore: (id: string) => Promise<void>) => {
      if (!pendingDelete) return;

      // Clear timeout
      clearTimeout(pendingDelete.timeoutId);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      try {
        // Restore conversation
        await onRestore(pendingDelete.conversationId);
        console.log('[UndoDelete] Restored conversation:', pendingDelete.conversationId);
      } catch (err) {
        console.error('[UndoDelete] Failed to restore conversation:', err);
        throw err;
      } finally {
        setPendingDelete(null);
        setTimeRemaining(0);
      }
    },
    [pendingDelete]
  );

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (pendingDelete) {
        clearTimeout(pendingDelete.timeoutId);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [pendingDelete]);

  return {
    pendingDelete,
    timeRemaining,
    scheduleDelete,
    cancelDelete,
  };
}
