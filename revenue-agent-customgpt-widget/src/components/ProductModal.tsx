'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ProductData } from './ProductPreview';
import { WishlistButton } from './WishlistButton';
import { useWishlist } from '@/hooks/useWishlist';
import { useGamification } from '@/hooks/useGamification';
import './ProductModal.css';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  allProducts: ProductData[];
  initialIndex: number;
  totalProducts: number;
}

/**
 * Modal component that shows detailed product information
 * Opens when user clicks on a product preview button
 * Supports carousel navigation between multiple products
 * Uses React Portal to render at document.body level
 */
const ProductModal = ({ isOpen, onClose, allProducts, initialIndex, totalProducts }: ProductModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  // Wishlist functionality
  const { isItemSavedByUrl, toggleItem } = useWishlist();

  // Gamification hook
  const { awardPointsForProductSave } = useGamification();

  // Get current product data - may be undefined if modal not open or invalid index
  const productData = allProducts?.[currentIndex];

  // Navigation handlers - defined before useEffect that uses them
  const handlePrev = useCallback(() => {
    setCurrentIndex(prev => prev === 0 ? totalProducts - 1 : prev - 1);
  }, [totalProducts]);

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => prev === totalProducts - 1 ? 0 : prev + 1);
  }, [totalProducts]);

  // Reset index and zoom state when modal opens with new initial index
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setIsImageZoomed(false);
    }
  }, [isOpen, initialIndex]);

  // Reset zoom when navigating between products
  useEffect(() => {
    setIsImageZoomed(false);
  }, [currentIndex]);

  // Handle escape key to close modal and arrow keys for navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      // Restore scroll position
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }

    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Early return AFTER all hooks
  if (!isOpen || !productData) return null;

  const citationIndex = currentIndex + 1;

  // Click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleViewProduct = () => {
    window.open(productData.url, '_blank', 'noopener,noreferrer');
  };

  // Clean up title (remove extra whitespace)
  const cleanTitle = productData.title?.trim() || 'Product Details';

  // Handle wishlist toggle
  const handleWishlistToggle = () => {
    const wasAlreadySaved = isItemSavedByUrl(productData.url);

    const success = toggleItem({
      id: productData.url, // Use URL as unique ID
      productUrl: productData.url,
      title: cleanTitle,
      price: productData.price,
      currency: productData.currency,
      imageUrl: productData.image,
      description: productData.description,
    });

    if (!success) {
      console.warn('Failed to toggle wishlist item');
    } else if (!wasAlreadySaved) {
      // Award points only when saving (not when removing)
      awardPointsForProductSave(productData.url);
    }
  };

  // Check if current product is saved
  const isProductSaved = isItemSavedByUrl(productData.url);

  // Render modal at document.body level using portal
  const modalContent = (
    <div
      className="product-modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
    >
      <div className="product-modal" ref={modalRef}>
        {/* Header Actions */}
        <div className="product-modal-header-actions">
          {/* Wishlist Button */}
          <WishlistButton
            isSaved={isProductSaved}
            onToggle={handleWishlistToggle}
          />

          {/* Close Button */}
          <button
            className="product-modal-close"
            onClick={onClose}
            aria-label="Close product details"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        {/* Citation Index Badge */}
        <div className="product-modal-badge">
          Source [{citationIndex}] of {totalProducts}
        </div>

        {/* Navigation Buttons - Only show if multiple products */}
        {totalProducts > 1 && (
          <>
            <button
              className="product-modal-nav product-modal-nav-prev"
              onClick={handlePrev}
              aria-label="Previous product"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
              </svg>
            </button>
            <button
              className="product-modal-nav product-modal-nav-next"
              onClick={handleNext}
              aria-label="Next product"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
              </svg>
            </button>
          </>
        )}

        {/* Product Image */}
        {productData.image && (
          <div
            className={`product-modal-image-container ${isImageZoomed ? 'zoomed' : ''}`}
            onClick={() => setIsImageZoomed(!isImageZoomed)}
            title={isImageZoomed ? 'Click to zoom out' : 'Click to zoom in'}
          >
            <img
              src={productData.image}
              alt={cleanTitle}
              className="product-modal-image"
              onError={(e) => {
                // Hide image container on load error
                const container = e.currentTarget.parentElement;
                if (container) {
                  container.style.display = 'none';
                }
              }}
            />
            <div className="product-modal-zoom-hint">
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                {isImageZoomed ? (
                  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM7 9h5v1H7z"/>
                ) : (
                  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zm.5-7H9v2H7v1h2v2h1v-2h2V9h-2z"/>
                )}
              </svg>
            </div>
          </div>
        )}

        {/* Product Details */}
        <div className="product-modal-content">
          <h2 id="product-modal-title" className="product-modal-title">
            {cleanTitle}
          </h2>

          {/* Brand & Rating */}
          {(productData.brand || productData.rating) && (
            <div className="product-modal-meta">
              {productData.brand && (
                <span className="product-modal-brand">{productData.brand}</span>
              )}
              {productData.rating && (
                <span className="product-modal-rating">
                  ⭐ {productData.rating}
                  {productData.reviewCount && ` (${productData.reviewCount})`}
                </span>
              )}
            </div>
          )}

          {productData.description && (
            <p className="product-modal-description">
              {productData.description}
            </p>
          )}

          {/* Price Info */}
          {productData.price && (
            <div className="product-modal-price-section">
              <div className="product-modal-price">
                {productData.currency && (
                  <span className="product-modal-currency">{productData.currency}</span>
                )}
                <span className="product-modal-price-value">{productData.price}</span>
              </div>

              {productData.availability && (
                <div className={`product-modal-availability ${
                  productData.availability.toLowerCase().includes('instock') ||
                  productData.availability.toLowerCase().includes('in_stock')
                    ? 'in-stock'
                    : 'out-of-stock'
                }`}>
                  {productData.availability.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}
                </div>
              )}
            </div>
          )}

          {/* Product URL */}
          <div className="product-modal-url">
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
              <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
            </svg>
            <span className="product-modal-url-text">{new URL(productData.url).hostname}</span>
          </div>

          {/* Action Buttons */}
          <div className="product-modal-actions">
            <button
              className="product-modal-button product-modal-button-primary"
              onClick={handleViewProduct}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
              </svg>
              View Product Page
            </button>
            <button
              className="product-modal-button product-modal-button-secondary"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Use portal to render at document.body level (client-side only)
  if (typeof window === 'undefined') return null;
  return createPortal(modalContent, document.body);
};

export default ProductModal;
