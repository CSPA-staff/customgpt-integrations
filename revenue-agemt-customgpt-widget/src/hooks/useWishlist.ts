/**
 * useWishlist Hook - React state management for wishlist
 * Provides reactive state and handlers for wishlist operations
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { WishlistItem, WishlistItemInput } from '@/types/wishlist';
import { WishlistService } from '@/lib/wishlist-service';

export interface UseWishlistReturn {
  /** All wishlist items */
  items: WishlistItem[];
  /** Total item count */
  count: number;
  /** Check if specific item is saved */
  isItemSaved: (id: string) => boolean;
  /** Check if item is saved by URL */
  isItemSavedByUrl: (url: string) => boolean;
  /** Add item to wishlist */
  addItem: (item: WishlistItemInput) => boolean;
  /** Remove item from wishlist */
  removeItem: (id: string) => boolean;
  /** Toggle item (add if not saved, remove if saved) */
  toggleItem: (item: WishlistItemInput) => boolean;
  /** Clear all items */
  clearAll: () => boolean;
  /** Refresh items from storage */
  refreshItems: () => void;
  /** Get specific item by ID */
  getItem: (id: string) => WishlistItem | undefined;
  /** Export wishlist as JSON */
  exportData: () => string;
  /** Import wishlist from JSON */
  importData: (jsonData: string, merge?: boolean) => boolean;
  /** Storage usage info */
  storageInfo: { itemCount: number; estimatedSize: string; maxItems: number };
}

/**
 * Custom hook for managing wishlist state
 */
export function useWishlist(): UseWishlistReturn {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [count, setCount] = useState<number>(0);

  // Load initial data
  const loadItems = useCallback(() => {
    const loadedItems = WishlistService.getItems();
    setItems(loadedItems);
    setCount(loadedItems.length);
  }, []);

  // Initialize on mount
  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Listen for cross-tab updates
  useEffect(() => {
    const handleStorageChange = () => {
      loadItems();
    };

    // Listen to custom event for same-tab updates
    window.addEventListener('wishlist-updated', handleStorageChange);

    // Listen to storage event for cross-tab updates
    window.addEventListener('storage', (e) => {
      if (e.key === 'customgpt_wishlist') {
        loadItems();
      }
    });

    return () => {
      window.removeEventListener('wishlist-updated', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadItems]);

  // Check if item is saved - depends on items state to trigger re-renders
  const isItemSaved = useCallback((id: string): boolean => {
    return items.some(item => item.id === id);
  }, [items]);

  // Check if item is saved by URL - depends on items state to trigger re-renders
  const isItemSavedByUrl = useCallback((url: string): boolean => {
    return items.some(item => item.productUrl === url);
  }, [items]);

  // Add item
  const addItem = useCallback((item: WishlistItemInput): boolean => {
    const success = WishlistService.addItem(item);
    if (success) {
      loadItems();
    }
    return success;
  }, [loadItems]);

  // Remove item
  const removeItem = useCallback((id: string): boolean => {
    const success = WishlistService.removeItem(id);
    if (success) {
      loadItems();
    }
    return success;
  }, [loadItems]);

  // Toggle item
  const toggleItem = useCallback((item: WishlistItemInput): boolean => {
    const success = WishlistService.toggleItem(item);
    if (success) {
      loadItems();
    }
    return success;
  }, [loadItems]);

  // Clear all items
  const clearAll = useCallback((): boolean => {
    const success = WishlistService.clearAll();
    if (success) {
      loadItems();
    }
    return success;
  }, [loadItems]);

  // Refresh items
  const refreshItems = useCallback(() => {
    loadItems();
  }, [loadItems]);

  // Get specific item
  const getItem = useCallback((id: string): WishlistItem | undefined => {
    return WishlistService.getItem(id);
  }, []);

  // Export data
  const exportData = useCallback((): string => {
    return WishlistService.exportData();
  }, []);

  // Import data
  const importData = useCallback((jsonData: string, merge = true): boolean => {
    const success = WishlistService.importData(jsonData, merge);
    if (success) {
      loadItems();
    }
    return success;
  }, [loadItems]);

  // Get storage info
  const storageInfo = WishlistService.getStorageInfo();

  return {
    items,
    count,
    isItemSaved,
    isItemSavedByUrl,
    addItem,
    removeItem,
    toggleItem,
    clearAll,
    refreshItems,
    getItem,
    exportData,
    importData,
    storageInfo,
  };
}
