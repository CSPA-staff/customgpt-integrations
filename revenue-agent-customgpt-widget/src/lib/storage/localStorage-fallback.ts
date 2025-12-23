/**
 * localStorage Fallback Storage
 *
 * Provides localStorage-based fallback for browsers without IndexedDB.
 * Implements the same interface as IndexedDBStorage for seamless integration.
 *
 * Limitations:
 * - Maximum 50 conversations (storage space constraints)
 * - Less efficient for large datasets
 * - No automatic indexing (slower searches)
 */

import type { MessageData } from '@/lib/ai/customgpt-client';
import type { Conversation, ConversationRecord, PaginatedResult } from './indexeddb';

/**
 * Storage configuration
 */
const STORAGE_KEY_PREFIX = 'customgpt_conv_';
const STORAGE_INDEX_KEY = 'customgpt_conv_index';
const MAX_CONVERSATIONS = 50;

/**
 * Retention policies (in milliseconds)
 */
const SOFT_DELETE_RETENTION = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_CONVERSATION_AGE = 90 * 24 * 60 * 60 * 1000; // 90 days

/**
 * Conversation index for efficient lookups
 */
interface ConversationIndex {
  sessionIds: string[];
  lastUpdated: number;
}

/**
 * localStorage-based storage implementation
 */
export class LocalStorageFallback {
  /**
   * Get the index of all conversations
   */
  private getIndex(): ConversationIndex {
    if (typeof window === 'undefined') {
      return { sessionIds: [], lastUpdated: Date.now() };
    }

    try {
      const indexData = localStorage.getItem(STORAGE_INDEX_KEY);
      if (!indexData) {
        return { sessionIds: [], lastUpdated: Date.now() };
      }

      return JSON.parse(indexData);
    } catch (error) {
      console.error('[LocalStorage] Failed to get index:', error);
      return { sessionIds: [], lastUpdated: Date.now() };
    }
  }

  /**
   * Update the conversation index
   */
  private saveIndex(index: ConversationIndex): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(index));
    } catch (error) {
      console.error('[LocalStorage] Failed to save index:', error);
      throw new Error('Failed to save conversation index');
    }
  }

  /**
   * Save or update a conversation
   *
   * @param record - Complete conversation record with messages
   * @throws Error if quota exceeded or operation fails
   */
  async save(record: ConversationRecord): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('localStorage not available');
    }

    try {
      const key = `${STORAGE_KEY_PREFIX}${record.sessionId}`;
      const index = this.getIndex();

      // Add to index if new conversation
      if (!index.sessionIds.includes(record.sessionId)) {
        // Enforce max conversations limit
        if (index.sessionIds.length >= MAX_CONVERSATIONS) {
          throw new Error(
            `Maximum ${MAX_CONVERSATIONS} conversations reached. Please delete old conversations.`
          );
        }

        index.sessionIds.push(record.sessionId);
        index.lastUpdated = Date.now();
        this.saveIndex(index);
      }

      // Save conversation record
      localStorage.setItem(key, JSON.stringify(record));
    } catch (error) {
      if (error instanceof Error) {
        // Check for quota exceeded error
        if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
          throw new Error('Storage quota exceeded. Please delete old conversations.');
        }
        throw error;
      }
      throw new Error('Failed to save conversation');
    }
  }

  /**
   * Get a single conversation by session ID
   *
   * @param sessionId - Conversation session ID
   * @returns Conversation record or null if not found
   */
  async get(sessionId: string): Promise<ConversationRecord | null> {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const key = `${STORAGE_KEY_PREFIX}${sessionId}`;
      const data = localStorage.getItem(key);

      if (!data) {
        return null;
      }

      const record = JSON.parse(data) as ConversationRecord;

      // Don't return soft-deleted conversations
      if (record.isDeleted) {
        return null;
      }

      return record;
    } catch (error) {
      console.error('[LocalStorage] Failed to get conversation:', error);
      return null;
    }
  }

  /**
   * Get all conversations with pagination
   *
   * @param offset - Number of records to skip (default: 0)
   * @param limit - Maximum number of records to return (default: 20)
   * @returns Paginated conversation list
   */
  async getAll(offset: number = 0, limit: number = 20): Promise<PaginatedResult<Conversation>> {
    if (typeof window === 'undefined') {
      return { items: [], hasMore: false, total: 0 };
    }

    try {
      const index = this.getIndex();
      const conversations: Conversation[] = [];

      // Load all conversations and filter out deleted ones
      for (const sessionId of index.sessionIds) {
        const record = await this.get(sessionId);
        if (record && !record.isDeleted) {
          // Extract conversation metadata (without messages)
          const { messages, ...conversation } = record;
          conversations.push(conversation);
        }
      }

      // Sort by most recent first
      conversations.sort((a, b) => b.updatedAt - a.updatedAt);

      const total = conversations.length;
      const items = conversations.slice(offset, offset + limit);
      const hasMore = total > offset + items.length;

      return { items, hasMore, total };
    } catch (error) {
      console.error('[LocalStorage] Failed to get conversations:', error);
      return { items: [], hasMore: false, total: 0 };
    }
  }

  /**
   * Search conversations by title or content
   *
   * @param query - Search query string
   * @returns List of matching conversations
   */
  async search(query: string): Promise<Conversation[]> {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const searchTerm = query.toLowerCase();
      const index = this.getIndex();
      const conversations: Conversation[] = [];

      // Search through all conversations
      for (const sessionId of index.sessionIds) {
        const record = await this.get(sessionId);
        if (!record || record.isDeleted) continue;

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

      // Sort by most recent first
      conversations.sort((a, b) => b.updatedAt - a.updatedAt);

      return conversations;
    } catch (error) {
      console.error('[LocalStorage] Failed to search conversations:', error);
      return [];
    }
  }

  /**
   * Soft delete a conversation
   *
   * @param sessionId - Conversation session ID
   * @throws Error if conversation not found or operation fails
   */
  async delete(sessionId: string): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('localStorage not available');
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
   * @throws Error if conversation not found or operation fails
   */
  async restore(sessionId: string): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('localStorage not available');
    }

    const key = `${STORAGE_KEY_PREFIX}${sessionId}`;
    const data = localStorage.getItem(key);

    if (!data) {
      throw new Error('Conversation not found');
    }

    const record = JSON.parse(data) as ConversationRecord;
    record.isDeleted = false;
    delete record.deletedAt;

    await this.save(record);
  }

  /**
   * Update conversation title
   *
   * @param sessionId - Conversation session ID
   * @param title - New title
   * @throws Error if conversation not found or operation fails
   */
  async updateTitle(sessionId: string, title: string): Promise<void> {
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
   */
  async cleanup(): Promise<number> {
    if (typeof window === 'undefined') {
      return 0;
    }

    try {
      const now = Date.now();
      const index = this.getIndex();
      const deletedSessionIds: string[] = [];

      for (const sessionId of index.sessionIds) {
        const key = `${STORAGE_KEY_PREFIX}${sessionId}`;
        const data = localStorage.getItem(key);

        if (!data) continue;

        const record = JSON.parse(data) as ConversationRecord;
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
          localStorage.removeItem(key);
          deletedSessionIds.push(sessionId);
        }
      }

      // Update index
      if (deletedSessionIds.length > 0) {
        index.sessionIds = index.sessionIds.filter((id) => !deletedSessionIds.includes(id));
        index.lastUpdated = Date.now();
        this.saveIndex(index);
      }

      return deletedSessionIds.length;
    } catch (error) {
      console.error('[LocalStorage] Failed to cleanup conversations:', error);
      return 0;
    }
  }

  /**
   * Get storage usage statistics
   *
   * @returns Storage statistics
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    deleted: number;
    totalSize: number;
  }> {
    if (typeof window === 'undefined') {
      return { total: 0, active: 0, deleted: 0, totalSize: 0 };
    }

    try {
      const index = this.getIndex();
      let total = 0;
      let active = 0;
      let deleted = 0;
      let totalSize = 0;

      for (const sessionId of index.sessionIds) {
        const key = `${STORAGE_KEY_PREFIX}${sessionId}`;
        const data = localStorage.getItem(key);

        if (!data) continue;

        const record = JSON.parse(data) as ConversationRecord;
        total++;

        if (record.isDeleted) {
          deleted++;
        } else {
          active++;
        }

        totalSize += data.length;
      }

      return { total, active, deleted, totalSize };
    } catch (error) {
      console.error('[LocalStorage] Failed to get stats:', error);
      return { total: 0, active: 0, deleted: 0, totalSize: 0 };
    }
  }

  /**
   * Clear all conversations (for testing/reset)
   */
  async clear(): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('localStorage not available');
    }

    try {
      const index = this.getIndex();

      // Remove all conversation records
      for (const sessionId of index.sessionIds) {
        const key = `${STORAGE_KEY_PREFIX}${sessionId}`;
        localStorage.removeItem(key);
      }

      // Clear the index
      localStorage.removeItem(STORAGE_INDEX_KEY);
    } catch (error) {
      console.error('[LocalStorage] Failed to clear conversations:', error);
      throw new Error('Failed to clear conversations');
    }
  }

  /**
   * Close storage (no-op for localStorage)
   */
  close(): void {
    // No cleanup needed for localStorage
  }
}

/**
 * Singleton instance
 */
export const localStorageFallback = new LocalStorageFallback();

/**
 * Check if localStorage is available in the current environment
 *
 * @returns True if localStorage is supported
 */
export function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const testKey = '__localStorage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}
