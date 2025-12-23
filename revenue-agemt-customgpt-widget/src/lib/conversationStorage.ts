/**
 * IndexedDB Conversation Storage
 *
 * Manages persistent storage of multiple conversation sessions.
 * Supports CRUD operations with soft delete and undo functionality.
 */

const DB_NAME = 'customgpt_conversations';
const DB_VERSION = 1;
const STORE_NAME = 'conversations';

export interface Conversation {
  id: string;                    // session_id from API
  title: string;                 // User-defined or auto-generated title
  createdAt: number;             // Timestamp
  updatedAt: number;             // Last message timestamp
  messageCount: number;          // Number of messages
  isDeleted: boolean;            // Soft delete flag
  firstUserMessage?: string;     // For auto-title generation
}

/**
 * Initialize IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB not available in SSR'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create conversations store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });

        // Indexes for efficient queries
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('isDeleted', 'isDeleted', { unique: false });
      }
    };
  });
}

/**
 * Save or update a conversation
 */
export async function saveConversation(conversation: Conversation): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(conversation);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get a conversation by ID
 */
export async function getConversation(id: string): Promise<Conversation | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get all conversations (excluding soft-deleted)
 */
export async function getAllConversations(): Promise<Conversation[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('updatedAt');
    const request = index.openCursor(null, 'prev'); // Newest first

    const conversations: Conversation[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        const conv = cursor.value as Conversation;
        // Exclude soft-deleted conversations
        if (!conv.isDeleted) {
          conversations.push(conv);
        }
        cursor.continue();
      } else {
        resolve(conversations);
      }
    };

    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(id: string, title: string): Promise<void> {
  const conversation = await getConversation(id);
  if (!conversation) {
    throw new Error(`Conversation ${id} not found`);
  }

  conversation.title = title.trim();
  conversation.updatedAt = Date.now();

  await saveConversation(conversation);
}

/**
 * Soft delete a conversation (mark as deleted)
 */
export async function softDeleteConversation(id: string): Promise<void> {
  const conversation = await getConversation(id);
  if (!conversation) {
    throw new Error(`Conversation ${id} not found`);
  }

  conversation.isDeleted = true;
  conversation.updatedAt = Date.now();

  await saveConversation(conversation);
}

/**
 * Restore a soft-deleted conversation
 */
export async function restoreConversation(id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const conversation = getRequest.result as Conversation | undefined;
      if (!conversation) {
        reject(new Error(`Conversation ${id} not found`));
        return;
      }

      conversation.isDeleted = false;
      conversation.updatedAt = Date.now();

      const putRequest = store.put(conversation);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };

    getRequest.onerror = () => reject(getRequest.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Permanently delete a conversation from IndexedDB
 */
export async function permanentDeleteConversation(id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Update conversation metadata (message count, last updated)
 */
export async function updateConversationMetadata(
  id: string,
  updates: Partial<Pick<Conversation, 'messageCount' | 'updatedAt' | 'firstUserMessage'>>
): Promise<void> {
  const conversation = await getConversation(id);
  if (!conversation) {
    throw new Error(`Conversation ${id} not found`);
  }

  Object.assign(conversation, updates);
  conversation.updatedAt = Date.now();

  await saveConversation(conversation);
}

/**
 * Clear all conversations (for testing/reset)
 */
export async function clearAllConversations(): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}
