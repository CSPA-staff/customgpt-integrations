/**
 * IndexedDB Storage Layer
 *
 * Provides IndexedDB wrapper for conversation persistence with:
 * - Automatic schema management and versioning
 * - CRUD operations for conversations
 * - Soft delete with automatic cleanup
 * - Indexed queries for performance
 * - Error handling with graceful degradation
 */

import type { MessageData } from '@/lib/ai/customgpt-client';

/**
 * Database configuration
 */
const DB_NAME = 'customgpt_widget';
const DB_VERSION = 1;
const STORE_NAME = 'conversations';

/**
 * Retention policies (in milliseconds)
 */
const SOFT_DELETE_RETENTION = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_CONVERSATION_AGE = 90 * 24 * 60 * 60 * 1000; // 90 days

/**
 * Conversation metadata for list views
 */
export interface Conversation {
  sessionId: string;
  title: string;
  previewText: string;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
  hasCitations: boolean;
  isDeleted?: boolean;
  deletedAt?: number;
}

/**
 * Complete conversation record with messages
 */
export interface ConversationRecord extends Conversation {
  messages: MessageData[];
}

/**
 * Query result pagination
 */
export interface PaginatedResult<T> {
  items: T[];
  hasMore: boolean;
  total: number;
}

/**
 * IndexedDB wrapper class with automatic schema management
 */
export class IndexedDBStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize database connection
   * Creates database and object stores on first use
   */
  private async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create conversations store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'sessionId' });

          // Create indexes for efficient queries
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
          store.createIndex('isDeleted', 'isDeleted', { unique: false });
          store.createIndex('deletedAt', 'deletedAt', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Save or update a conversation
   *
   * @param record - Complete conversation record with messages
   * @throws Error if database operation fails
   */
  async save(record: ConversationRecord): Promise<void> {
    await this.init();

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to save conversation: ${request.error?.message}`));
    });
  }

  /**
   * Get a single conversation by session ID
   *
   * @param sessionId - Conversation session ID
   * @returns Conversation record or null if not found
   * @throws Error if database operation fails
   */
  async get(sessionId: string): Promise<ConversationRecord | null> {
    await this.init();

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.get(sessionId);

      request.onsuccess = () => {
        const record = request.result as ConversationRecord | undefined;

        // Don't return soft-deleted conversations
        if (record?.isDeleted) {
          resolve(null);
        } else {
          resolve(record || null);
        }
      };

      request.onerror = () => reject(new Error(`Failed to get conversation: ${request.error?.message}`));
    });
  }

  /**
   * Get all conversations with pagination
   *
   * @param offset - Number of records to skip (default: 0)
   * @param limit - Maximum number of records to return (default: 20)
   * @returns Paginated conversation list
   * @throws Error if database operation fails
   */
  async getAll(offset: number = 0, limit: number = 20): Promise<PaginatedResult<Conversation>> {
    await this.init();

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('updatedAt');

      const conversations: Conversation[] = [];
      let total = 0;
      let skipped = 0;

      // Open cursor in descending order (most recent first)
      const request = index.openCursor(null, 'prev');

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

        if (cursor) {
          const record = cursor.value as ConversationRecord;

          // Skip soft-deleted conversations
          if (!record.isDeleted) {
            total++;

            // Apply pagination
            if (skipped < offset) {
              skipped++;
            } else if (conversations.length < limit) {
              // Extract conversation metadata (without messages)
              const { messages, ...conversation } = record;
              conversations.push(conversation);
            }
          }

          cursor.continue();
        } else {
          // Cursor exhausted
          resolve({
            items: conversations,
            hasMore: total > offset + conversations.length,
            total,
          });
        }
      };

      request.onerror = () => reject(new Error(`Failed to get conversations: ${request.error?.message}`));
    });
  }

  /**
   * Search conversations by title or content
   *
   * @param query - Search query string
   * @returns List of matching conversations
   * @throws Error if database operation fails
   */
  async search(query: string): Promise<Conversation[]> {
    await this.init();

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const searchTerm = query.toLowerCase();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      const conversations: Conversation[] = [];
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

        if (cursor) {
          const record = cursor.value as ConversationRecord;

          // Skip soft-deleted conversations
          if (!record.isDeleted) {
            const titleMatch = record.title.toLowerCase().includes(searchTerm);
            const previewMatch = record.previewText.toLowerCase().includes(searchTerm);
            const messageMatch = record.messages.some(
              (msg) =>
                msg.user_query.toLowerCase().includes(searchTerm) ||
                msg.openai_response.toLowerCase().includes(searchTerm)
            );

            if (titleMatch || previewMatch || messageMatch) {
              // Extract conversation metadata (without messages)
              const { messages, ...conversation } = record;
              conversations.push(conversation);
            }
          }

          cursor.continue();
        } else {
          // Sort by most recent first
          conversations.sort((a, b) => b.updatedAt - a.updatedAt);
          resolve(conversations);
        }
      };

      request.onerror = () => reject(new Error(`Failed to search conversations: ${request.error?.message}`));
    });
  }

  /**
   * Soft delete a conversation
   * Marks conversation as deleted instead of removing it permanently
   *
   * @param sessionId - Conversation session ID
   * @throws Error if database operation fails
   */
  async delete(sessionId: string): Promise<void> {
    await this.init();

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const record = await this.get(sessionId);
    if (!record) {
      throw new Error('Conversation not found');
    }

    record.isDeleted = true;
    record.deletedAt = Date.now();

    await this.save(record);
  }

  /**
   * Restore a soft-deleted conversation
   *
   * @param sessionId - Conversation session ID
   * @throws Error if database operation fails
   */
  async restore(sessionId: string): Promise<void> {
    await this.init();

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const getRequest = store.get(sessionId);

      getRequest.onsuccess = () => {
        const record = getRequest.result as ConversationRecord | undefined;

        if (!record) {
          reject(new Error('Conversation not found'));
          return;
        }

        // Remove soft delete flags
        record.isDeleted = false;
        delete record.deletedAt;

        const putRequest = store.put(record);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(new Error(`Failed to restore conversation: ${putRequest.error?.message}`));
      };

      getRequest.onerror = () => reject(new Error(`Failed to get conversation: ${getRequest.error?.message}`));
    });
  }

  /**
   * Update conversation title
   *
   * @param sessionId - Conversation session ID
   * @param title - New title
   * @throws Error if database operation fails
   */
  async updateTitle(sessionId: string, title: string): Promise<void> {
    await this.init();

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const record = await this.get(sessionId);
    if (!record) {
      throw new Error('Conversation not found');
    }

    record.title = title;
    record.updatedAt = Date.now();

    await this.save(record);
  }

  /**
   * Cleanup old conversations
   * Permanently deletes:
   * - Soft-deleted conversations older than 30 days
   * - All conversations older than 90 days
   *
   * @returns Number of conversations deleted
   * @throws Error if database operation fails
   */
  async cleanup(): Promise<number> {
    await this.init();

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const now = Date.now();
    const deletedKeys: string[] = [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

        if (cursor) {
          const record = cursor.value as ConversationRecord;

          let shouldDelete = false;

          // Delete soft-deleted conversations older than retention period
          if (record.isDeleted && record.deletedAt) {
            if (now - record.deletedAt > SOFT_DELETE_RETENTION) {
              shouldDelete = true;
            }
          }

          // Delete old conversations regardless of deletion status
          if (now - record.createdAt > MAX_CONVERSATION_AGE) {
            shouldDelete = true;
          }

          if (shouldDelete) {
            deletedKeys.push(record.sessionId);
            cursor.delete();
          }

          cursor.continue();
        } else {
          // Cursor exhausted
          resolve(deletedKeys.length);
        }
      };

      request.onerror = () => reject(new Error(`Failed to cleanup conversations: ${request.error?.message}`));
    });
  }

  /**
   * Get storage usage statistics
   *
   * @returns Storage statistics
   * @throws Error if database operation fails
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    deleted: number;
    totalSize: number;
  }> {
    await this.init();

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      let total = 0;
      let active = 0;
      let deleted = 0;
      let totalSize = 0;

      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

        if (cursor) {
          const record = cursor.value as ConversationRecord;
          total++;

          if (record.isDeleted) {
            deleted++;
          } else {
            active++;
          }

          // Estimate size (rough approximation)
          totalSize += JSON.stringify(record).length;

          cursor.continue();
        } else {
          resolve({
            total,
            active,
            deleted,
            totalSize,
          });
        }
      };

      request.onerror = () => reject(new Error(`Failed to get stats: ${request.error?.message}`));
    });
  }

  /**
   * Clear all conversations (for testing/reset)
   *
   * @throws Error if database operation fails
   */
  async clear(): Promise<void> {
    await this.init();

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to clear conversations: ${request.error?.message}`));
    });
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

/**
 * Singleton instance
 */
export const indexedDBStorage = new IndexedDBStorage();

/**
 * Check if IndexedDB is available in the current environment
 *
 * @returns True if IndexedDB is supported
 */
export function isIndexedDBAvailable(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    return 'indexedDB' in window && window.indexedDB !== null;
  } catch {
    return false;
  }
}
