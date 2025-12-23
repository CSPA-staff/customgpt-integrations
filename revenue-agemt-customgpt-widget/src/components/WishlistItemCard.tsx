/**
 * WishlistItemCard Component
 * Displays individual saved product in wishlist panel
 */

'use client';

import React from 'react';
import { WishlistItem } from '@/types/wishlist';
import './WishlistItemCard.css';

interface WishlistItemCardProps {
  /** Wishlist item data */
  item: WishlistItem;
  /** Callback when item is clicked */
  onClick: () => void;
  /** Callback when remove button is clicked */
  onRemove: () => void;
}

export const WishlistItemCard: React.FC<WishlistItemCardProps> = ({
  item,
  onClick,
  onRemove,
}) => {
  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click when removing
    onRemove();
  };

  // Format saved date as relative time
  const getRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  // Truncate title if too long
  const truncateTitle = (title: string, maxLength: number = 80): string => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength).trim() + '...';
  };

  return (
    <div className="wishlist-item-card" onClick={onClick}>
      {/* Remove Button */}
      <button
        className="wishlist-item-card__remove"
        onClick={handleRemoveClick}
        aria-label={`Remove ${item.title} from wishlist`}
        title="Remove from wishlist"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>

      {/* Product Image */}
      {item.imageUrl && (
        <div className="wishlist-item-card__image-container">
          <img
            src={item.imageUrl}
            alt={item.title}
            className="wishlist-item-card__image"
            loading="lazy"
            onError={(e) => {
              // Hide image on error
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Product Info */}
      <div className="wishlist-item-card__content">
        <h3 className="wishlist-item-card__title" title={item.title}>
          {truncateTitle(item.title)}
        </h3>

        {item.price && (
          <div className="wishlist-item-card__price">
            <span className="wishlist-item-card__currency">{item.currency || '$'}</span>
            {item.price}
          </div>
        )}

        <div className="wishlist-item-card__meta">
          {item.source && (
            <span className="wishlist-item-card__source">
              {item.source}
            </span>
          )}
          <span className="wishlist-item-card__date">
            {getRelativeTime(item.savedAt)}
          </span>
        </div>
      </div>
    </div>
  );
};
