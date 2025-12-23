/**
 * useConversationPersistence Hook
 *
 * Handles localStorage persistence for conversation sessions.
 * Stores session_id so chat history survives page refreshes.
 */

const STORAGE_KEY = 'customgpt_conversation';

interface StoredConversation {
  sessionId: string;
  createdAt: number;
}

/**
 * Save conversation session to localStorage
 */
export function saveConversation(sessionId: string): void {
  if (typeof window === 'undefined') return;

  try {
    const data: StoredConversation = {
      sessionId,
      createdAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('[Persistence] Failed to save conversation:', error);
  }
}

/**
 * Load conversation session from localStorage
 */
export function loadConversation(): StoredConversation | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const data: StoredConversation = JSON.parse(stored);

    // Validate the stored data has required fields
    if (!data.sessionId || !data.createdAt) {
      clearConversation();
      return null;
    }

    return data;
  } catch (error) {
    console.error('[Persistence] Failed to load conversation:', error);
    clearConversation();
    return null;
  }
}

/**
 * Clear conversation from localStorage (for new conversation button)
 */
export function clearConversation(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('[Persistence] Failed to clear conversation:', error);
  }
}

/**
 * Check if a stored conversation exists
 */
export function hasStoredConversation(): boolean {
  return loadConversation() !== null;
}
