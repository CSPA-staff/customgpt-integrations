/**
 * IndexedDB storage for conversation history
 *
 * Stores conversation metadata and provides query/mutation methods.
 * Each conversation includes: id, title, messageCount, createdAt, updatedAt
 */

const DB_NAME = 'customgpt_conversations';
const DB_VERSION = 1;
const STORE_NAME = 'conversations';

export interface Conversation {
  id: string; // session_id from API
  title: string; // Auto-generated from first message or user-defined
  messageCount: number;
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
  lastMessage?: string; // Preview of last message
}

let dbInstance: IDBDatabase | null = null;

/**
 * Initialize IndexedDB connection
 */
async function initDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[ConversationDB] Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      console.log('[ConversationDB] Database opened successfully');
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create conversations store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });

        // Create indexes for efficient querying
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });

        console.log('[ConversationDB] Object store created');
      }
    };
  });
}

/**
 * Get all conversations, sorted by most recent first
 */
export async function getAllConversations(): Promise<Conversation[]> {
  try {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('updatedAt');

    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, 'prev'); // descending order
      const conversations: Conversation[] = [];

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          conversations.push(cursor.value);
          cursor.continue();
        } else {
          resolve(conversations);
        }
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[ConversationDB] Failed to get conversations:', error);
    return [];
  }
}

/**
 * Get a single conversation by ID
 */
export async function getConversation(id: string): Promise<Conversation | null> {
  try {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[ConversationDB] Failed to get conversation:', error);
    return null;
  }
}

/**
 * Save or update a conversation
 */
export async function saveConversationToDb(conversation: Conversation): Promise<void> {
  try {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.put(conversation);

      request.onsuccess = () => {
        console.log('[ConversationDB] Conversation saved:', conversation.id);
        resolve();
      };

      request.onerror = () => {
        console.error('[ConversationDB] Failed to save conversation:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[ConversationDB] Failed to save conversation:', error);
    throw error;
  }
}

/**
 * Delete a conversation
 */
export async function deleteConversation(id: string): Promise<void> {
  try {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('[ConversationDB] Conversation deleted:', id);
        resolve();
      };

      request.onerror = () => {
        console.error('[ConversationDB] Failed to delete conversation:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[ConversationDB] Failed to delete conversation:', error);
    throw error;
  }
}

/**
 * Update conversation metadata (title, messageCount, updatedAt)
 */
export async function updateConversationMetadata(
  id: string,
  updates: Partial<Omit<Conversation, 'id' | 'createdAt'>>
): Promise<void> {
  try {
    const existing = await getConversation(id);
    if (!existing) {
      console.warn('[ConversationDB] Conversation not found for update:', id);
      return;
    }

    const updated: Conversation = {
      ...existing,
      ...updates,
      updatedAt: Date.now(), // Always update timestamp
    };

    await saveConversationToDb(updated);
  } catch (error) {
    console.error('[ConversationDB] Failed to update conversation metadata:', error);
    throw error;
  }
}

/**
 * Generate a title from the first user message
 */
export function generateConversationTitle(firstMessage: string): string {
  // Truncate to 50 characters max
  const truncated = firstMessage.length > 50
    ? firstMessage.substring(0, 50).trim() + '...'
    : firstMessage.trim();

  return truncated || 'New Conversation';
}

/**
 * Clear all conversations (for testing/reset)
 */
export async function clearAllConversations(): Promise<void> {
  try {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.clear();

      request.onsuccess = () => {
        console.log('[ConversationDB] All conversations cleared');
        resolve();
      };

      request.onerror = () => {
        console.error('[ConversationDB] Failed to clear conversations:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[ConversationDB] Failed to clear conversations:', error);
    throw error;
  }
}
