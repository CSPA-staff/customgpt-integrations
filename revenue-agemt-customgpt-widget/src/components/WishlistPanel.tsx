/**
 * WishlistPanel Component - Redesigned for Header Integration
 * Subtle icon-based component with dropdown panel
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { WishlistItem } from '@/types/wishlist';
import { WishlistItemCard } from './WishlistItemCard';
import './WishlistPanel.css';

interface WishlistPanelProps {
  /** Array of wishlist items */
  items: WishlistItem[];
  /** Callback when item is clicked */
  onItemClick: (item: WishlistItem) => void;
  /** Callback when item is removed */
  onItemRemove: (id: string) => void;
  /** Callback when clear all is clicked */
  onClearAll: () => void;
}

export const WishlistPanel: React.FC<WishlistPanelProps> = ({
  items,
  onItemClick,
  onItemRemove,
  onClearAll,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const itemCount = items.length;
  const hasItems = itemCount > 0;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleClearAll = () => {
    if (window.confirm(`Remove all ${itemCount} items from wishlist?`)) {
      onClearAll();
      setIsOpen(false);
    }
  };

  // Don't render if no items
  if (!hasItems) {
    return null;
  }

  return (
    <div className="wishlist-header-container" ref={panelRef}>
      {/* Icon Button */}
      <button
        className="wishlist-header-button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-label={`Wishlist - ${itemCount} saved items`}
        title={`${itemCount} saved item${itemCount !== 1 ? 's' : ''}`}
      >
        {/* Heart Icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          width="20"
          height="20"
          className="wishlist-header-icon"
        >
          <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
        </svg>

        {/* Count Badge */}
        <span className="wishlist-header-badge">{itemCount}</span>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="wishlist-dropdown-panel">
          {/* Header */}
          <div className="wishlist-dropdown-header">
            <h3 className="wishlist-dropdown-title">
              Saved Items ({itemCount})
            </h3>
            <button
              className="wishlist-dropdown-clear"
              onClick={handleClearAll}
              aria-label="Clear all saved items"
            >
              Clear All
            </button>
          </div>

          {/* Items Grid */}
          <div className="wishlist-dropdown-content">
            {items.map((item) => (
              <WishlistItemCard
                key={item.id}
                item={item}
                onClick={() => {
                  onItemClick(item);
                  setIsOpen(false); // Close dropdown when opening modal
                }}
                onRemove={() => onItemRemove(item.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
