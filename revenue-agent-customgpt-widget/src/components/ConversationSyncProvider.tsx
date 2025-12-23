'use client';

import { ReactNode, useEffect } from 'react';
import { useConversationSync } from '@/hooks/useConversationSync';

interface ConversationSyncProviderProps {
  children: ReactNode;
}

/**
 * Provider component that monitors and syncs conversation state with IndexedDB.
 * Wraps ChatContainer to add persistence without modifying it.
 */
export function ConversationSyncProvider({ children }: ConversationSyncProviderProps) {
  // Start conversation sync monitoring
  useConversationSync();

  return <>{children}</>;
}
