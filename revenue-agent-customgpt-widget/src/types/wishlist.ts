/**
 * Wishlist data structures for save for later functionality
 */

export interface WishlistItem {
  /** Unique identifier (URL or generated ID) */
  id: string;
  /** Product page URL */
  productUrl: string;
  /** Product title */
  title: string;
  /** Product price (optional) */
  price?: string;
  /** Currency symbol (e.g., "$", "€", "£") */
  currency?: string;
  /** Product image URL (optional) */
  imageUrl?: string;
  /** Product description (optional) */
  description?: string;
  /** Timestamp when saved */
  savedAt: number;
  /** Source domain (e.g., "amazon.com") */
  source?: string;
}

export interface WishlistData {
  /** Schema version for future migrations */
  version: string;
  /** Array of saved products */
  items: WishlistItem[];
  /** Last modification timestamp */
  lastModified: number;
}

export type WishlistItemInput = Omit<WishlistItem, 'savedAt'>;
