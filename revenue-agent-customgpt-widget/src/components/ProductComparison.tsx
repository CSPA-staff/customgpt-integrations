'use client';

import { useState } from 'react';
import { ProductData } from './ProductPreview';
import ProductModal from './ProductModal';
import './ProductComparison.css';

interface ProductComparisonProps {
  products: ProductData[];
  onClose: () => void;
}

/**
 * Product comparison table component
 * Shows all products side-by-side in a table format for easy comparison
 * Initially shows name and price, can be extended with more attributes
 */
const ProductComparison = ({ products, onClose }: ProductComparisonProps) => {
  const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null);

  if (!products || products.length === 0) return null;

  const handleProductClick = (product: ProductData) => {
    // Find the original index in the full products array for the modal
    const originalIndex = products.findIndex(p => p.url === product.url && p.title === product.title);
    setSelectedProductIndex(originalIndex !== -1 ? originalIndex : 0);
  };

  const handleCloseModal = () => {
    setSelectedProductIndex(null);
  };

  // Helper to extract numeric price for sorting/display
  const extractPrice = (priceStr?: string): number | null => {
    if (!priceStr) return null;
    const match = priceStr.match(/[\d,]+\.?\d*/);
    return match ? parseFloat(match[0].replace(/,/g, '')) : null;
  };

  // Helper to check if a value is valid (not N/A, 0, empty, or "not found")
  const isValidValue = (value?: string | number): boolean => {
    if (value === undefined || value === null) return false;
    if (typeof value === 'number') return value > 0;
    const str = String(value).toLowerCase().trim();
    if (!str) return false;
    if (str === 'n/a' || str === 'na' || str === '0' || str === 'not found' || str === 'unavailable') return false;
    return true;
  };

  // Check if a product has at least one valid comparison value (price, rating, or availability)
  const hasValidComparisonData = (product: ProductData): boolean => {
    const hasPrice = isValidValue(product.price) && extractPrice(product.price) !== 0;
    const hasRating = isValidValue(product.rating);
    const hasAvailability = isValidValue(product.availability);
    return hasPrice || hasRating || hasAvailability;
  };

  // Filter products to only include those with at least one valid comparison value
  const filteredProducts = products.filter(hasValidComparisonData);

  // If no products have valid comparison data, show all products anyway
  const displayProducts = filteredProducts.length > 0 ? filteredProducts : products;

  // Check if any product has a valid price
  const hasValidPrice = displayProducts.some(p => isValidValue(p.price) && extractPrice(p.price) !== 0);

  // Check if any product has a valid rating
  const hasValidRating = displayProducts.some(p => isValidValue(p.rating));

  // Check if any product has a valid availability
  const hasValidAvailability = displayProducts.some(p => isValidValue(p.availability));

  return (
    <div className="product-comparison-wrapper">
      <div className="product-comparison-header">
        <h3>Product Comparison</h3>
        <button
          className="comparison-close-btn"
          onClick={onClose}
          aria-label="Close comparison"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>

      <div className="product-comparison-table-container">
        <table className="product-comparison-table">
          <thead>
            <tr>
              <th className="comparison-attribute">Product</th>
              {displayProducts.map((product, index) => (
                <th key={index} className="comparison-product-header">
                  <button
                    className="comparison-product-title"
                    onClick={() => handleProductClick(product)}
                    title="Click to view details"
                  >
                    {product.title}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Price Row - only show if at least one product has valid price */}
            {hasValidPrice && (
              <tr>
                <td className="comparison-attribute">Price</td>
                {displayProducts.map((product, index) => {
                  return (
                    <td key={index} className="comparison-value">
                      {isValidValue(product.price) ? (
                        <span className="comparison-price">
                          <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" className="price-icon">
                            <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
                          </svg>
                          {product.price}
                        </span>
                      ) : (
                        <span className="comparison-na">N/A</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            )}

            {/* Rating Row - only show if at least one product has valid rating */}
            {hasValidRating && (
              <tr>
                <td className="comparison-attribute">Rating</td>
                {displayProducts.map((product, index) => (
                  <td key={index} className="comparison-value">
                    {isValidValue(product.rating) ? (
                      <span className="comparison-rating">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" className="rating-icon">
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                        </svg>
                        {product.rating}
                        {product.reviewCount && (
                          <span className="comparison-review-count">({product.reviewCount})</span>
                        )}
                      </span>
                    ) : (
                      <span className="comparison-na">N/A</span>
                    )}
                  </td>
                ))}
              </tr>
            )}

            {/* Availability Row - only show if at least one product has valid availability */}
            {hasValidAvailability && (
              <tr>
                <td className="comparison-attribute">Availability</td>
                {displayProducts.map((product, index) => (
                  <td key={index} className="comparison-value">
                    {isValidValue(product.availability) ? (
                      <span className={`comparison-availability ${
                        product.availability!.toLowerCase().includes('instock') ||
                        product.availability!.toLowerCase().includes('in_stock')
                          ? 'in-stock'
                          : 'out-of-stock'
                      }`}>
                        {product.availability!.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    ) : (
                      <span className="comparison-na">N/A</span>
                    )}
                  </td>
                ))}
              </tr>
            )}

            {/* Actions Row */}
            <tr>
              <td className="comparison-attribute">Actions</td>
              {displayProducts.map((product, index) => (
                <td key={index} className="comparison-value">
                  <div className="comparison-actions">
                    <button
                      className="comparison-view-btn"
                      onClick={() => handleProductClick(product)}
                      title="View product details"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                      </svg>
                      View
                    </button>
                    <a
                      href={product.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="comparison-buy-btn"
                      title="Visit product page"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                        <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
                      </svg>
                      Buy
                    </a>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Product Modal for detailed view */}
      {selectedProductIndex !== null && (
        <ProductModal
          isOpen={true}
          onClose={handleCloseModal}
          allProducts={products}
          initialIndex={selectedProductIndex}
          totalProducts={products.length}
        />
      )}
    </div>
  );
};

export default ProductComparison;
