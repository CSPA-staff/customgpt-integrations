/**
 * Wishlist Service - LocalStorage management for saved products
 * Handles all persistence operations with comprehensive error handling
 */

import { WishlistData, WishlistItem, WishlistItemInput } from '@/types/wishlist';

export class WishlistService {
  private static readonly STORAGE_KEY = 'customgpt_wishlist';
  private static readonly CURRENT_VERSION = '1.0';
  private static readonly MAX_ITEMS = 500; // Prevent storage bloat

  /**
   * Check if localStorage is available
   */
  private static isStorageAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.warn('localStorage is not available:', e);
      return false;
    }
  }

  /**
   * Get wishlist data from localStorage with error handling
   */
  private static getData(): WishlistData {
    if (!this.isStorageAvailable()) {
      return this.getEmptyData();
    }

    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) {
        return this.getEmptyData();
      }

      const data = JSON.parse(raw) as WishlistData;

      // Validate data structure
      if (!data.version || !Array.isArray(data.items)) {
        console.warn('Invalid wishlist data structure, resetting');
        return this.getEmptyData();
      }

      // Migrate if needed
      if (data.version !== this.CURRENT_VERSION) {
        return this.migrateData(data);
      }

      return data;
    } catch (error) {
      console.error('Error reading wishlist data:', error);
      // Corrupted data - reset to empty
      return this.getEmptyData();
    }
  }

  /**
   * Save wishlist data to localStorage with error handling
   */
  private static setData(data: WishlistData): boolean {
    if (!this.isStorageAvailable()) {
      return false;
    }

    try {
      data.lastModified = Date.now();
      const serialized = JSON.stringify(data);
      localStorage.setItem(this.STORAGE_KEY, serialized);

      // Trigger storage event for cross-tab sync
      window.dispatchEvent(new Event('wishlist-updated'));

      return true;
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.error('LocalStorage quota exceeded');
        // Try to make space by removing oldest items
        this.removeOldestItems(10);
        // Retry once
        try {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
          return true;
        } catch (retryError) {
          console.error('Failed to save even after cleanup:', retryError);
          return false;
        }
      }
      console.error('Error saving wishlist data:', error);
      return false;
    }
  }

  /**
   * Get empty wishlist data structure
   */
  private static getEmptyData(): WishlistData {
    return {
      version: this.CURRENT_VERSION,
      items: [],
      lastModified: Date.now(),
    };
  }

  /**
   * Migrate data from old version to new version
   */
  private static migrateData(oldData: WishlistData): WishlistData {
    console.log(`Migrating wishlist data from v${oldData.version} to v${this.CURRENT_VERSION}`);

    // For now, just update version (no structure changes yet)
    // In future, add migration logic here
    return {
      ...oldData,
      version: this.CURRENT_VERSION,
      lastModified: Date.now(),
    };
  }

  /**
   * Remove oldest N items to free up space
   */
  private static removeOldestItems(count: number): void {
    const data = this.getData();
    if (data.items.length === 0) return;

    // Sort by savedAt timestamp (oldest first)
    data.items.sort((a, b) => a.savedAt - b.savedAt);

    // Remove oldest items
    data.items = data.items.slice(count);

    this.setData(data);
  }

  /**
   * Generate unique ID from product URL
   */
  private static generateId(url: string): string {
    // Use URL as base, clean it up
    try {
      const urlObj = new URL(url);
      // For Amazon, extract ASIN from URL
      const amazonMatch = url.match(/\/dp\/([A-Z0-9]{10})/);
      if (amazonMatch) {
        return `amazon_${amazonMatch[1]}`;
      }
      // For other sites, use hostname + pathname hash
      return `${urlObj.hostname}_${this.hashCode(urlObj.pathname)}`;
    } catch {
      // Invalid URL, use hash of entire string
      return `product_${this.hashCode(url)}`;
    }
  }

  /**
   * Simple hash function for strings
   */
  private static hashCode(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Extract source domain from URL
   */
  private static extractSource(url: string): string | undefined {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return undefined;
    }
  }

  // ============================================
  // Public API Methods
  // ============================================

  /**
   * Add item to wishlist
   */
  static addItem(item: WishlistItemInput): boolean {
    const data = this.getData();

    // Check max items limit
    if (data.items.length >= this.MAX_ITEMS) {
      console.warn(`Wishlist is full (max ${this.MAX_ITEMS} items)`);
      return false;
    }

    // Generate ID if not provided or use productUrl
    const id = item.id || this.generateId(item.productUrl);

    // Check for duplicates
    if (data.items.some(existingItem => existingItem.id === id)) {
      console.log('Item already in wishlist');
      return false;
    }

    // Create new item with timestamp and source
    const newItem: WishlistItem = {
      ...item,
      id,
      savedAt: Date.now(),
      source: item.source || this.extractSource(item.productUrl),
    };

    // Add to beginning of list (most recent first)
    data.items.unshift(newItem);

    return this.setData(data);
  }

  /**
   * Remove item from wishlist by ID
   */
  static removeItem(id: string): boolean {
    const data = this.getData();
    const initialLength = data.items.length;

    data.items = data.items.filter(item => item.id !== id);

    // Check if item was actually removed
    if (data.items.length === initialLength) {
      console.warn(`Item with id ${id} not found in wishlist`);
      return false;
    }

    return this.setData(data);
  }

  /**
   * Get all wishlist items
   */
  static getItems(): WishlistItem[] {
    const data = this.getData();
    return [...data.items]; // Return copy to prevent mutations
  }

  /**
   * Check if item is saved in wishlist
   */
  static isItemSaved(id: string): boolean {
    const data = this.getData();
    return data.items.some(item => item.id === id);
  }

  /**
   * Check if item is saved by URL
   */
  static isItemSavedByUrl(url: string): boolean {
    const id = this.generateId(url);
    return this.isItemSaved(id);
  }

  /**
   * Get item by ID
   */
  static getItem(id: string): WishlistItem | undefined {
    const data = this.getData();
    return data.items.find(item => item.id === id);
  }

  /**
   * Clear all items from wishlist
   */
  static clearAll(): boolean {
    return this.setData(this.getEmptyData());
  }

  /**
   * Get wishlist item count
   */
  static getCount(): number {
    const data = this.getData();
    return data.items.length;
  }

  /**
   * Toggle item (add if not saved, remove if saved)
   */
  static toggleItem(item: WishlistItemInput): boolean {
    const id = item.id || this.generateId(item.productUrl);

    if (this.isItemSaved(id)) {
      return this.removeItem(id);
    } else {
      return this.addItem(item);
    }
  }

  /**
   * Export wishlist as JSON (for backup/sharing)
   */
  static exportData(): string {
    const data = this.getData();
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import wishlist from JSON (merge with existing)
   */
  static importData(jsonData: string, merge = true): boolean {
    try {
      const importedData = JSON.parse(jsonData) as WishlistData;

      if (!importedData.version || !Array.isArray(importedData.items)) {
        console.error('Invalid import data format');
        return false;
      }

      if (merge) {
        const currentData = this.getData();
        const existingIds = new Set(currentData.items.map(item => item.id));

        // Add only new items
        const newItems = importedData.items.filter(item => !existingIds.has(item.id));
        currentData.items.push(...newItems);

        return this.setData(currentData);
      } else {
        // Replace entire wishlist
        return this.setData(importedData);
      }
    } catch (error) {
      console.error('Error importing wishlist data:', error);
      return false;
    }
  }

  /**
   * Get storage usage info
   */
  static getStorageInfo(): { itemCount: number; estimatedSize: string; maxItems: number } {
    const data = this.getData();
    const serialized = JSON.stringify(data);
    const sizeInBytes = new Blob([serialized]).size;
    const sizeInKB = (sizeInBytes / 1024).toFixed(2);

    return {
      itemCount: data.items.length,
      estimatedSize: `${sizeInKB} KB`,
      maxItems: this.MAX_ITEMS,
    };
  }
}
