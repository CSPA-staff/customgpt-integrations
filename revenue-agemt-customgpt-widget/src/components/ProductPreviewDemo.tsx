'use client';

import { useState } from 'react';
import ProductModal from './ProductModal';
import { ProductData } from './ProductPreview';
import './ProductPreviewDemo.css';

interface ProductPreviewDemoProps {
  citationUrl: string;
  citationTitle: string;
  citationIndex: number;
  activeLayout: 'horizontal' | 'carousel' | 'vertical';
  productData: ProductData;
  allProducts: ProductData[];
  totalProducts: number;
}

/**
 * Single product preview that renders in the specified layout
 * Product data is passed as prop (already fetched and cached by parent)
 */
const ProductPreviewDemo = ({ citationUrl, citationTitle, citationIndex, activeLayout, productData, allProducts, totalProducts }: ProductPreviewDemoProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  return (
    <>
      {/* OPTION A: Amazon-Style Vertical Card */}
      {activeLayout === 'horizontal' && (
        <div className="product-card-amazon" onClick={handleOpenModal}>
          {/* Image with Price Overlay */}
          <div className="product-amazon-image">
            {productData.price && (
              <div className="product-amazon-price-badge">
                {productData.currency && <span className="price-currency">{productData.currency}</span>}
                <span className="price-value">{productData.price}</span>
              </div>
            )}
            {productData.image ? (
              <img src={productData.image} alt={productData.title} />
            ) : (
              <div className="product-amazon-placeholder">
                <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                </svg>
              </div>
            )}
          </div>
          {/* Card Content */}
          <div className="product-amazon-content">
            {productData.brand && (
              <div className="product-amazon-brand">{productData.brand}</div>
            )}
            <div className="product-amazon-title">{productData.title}</div>
            <div className="product-amazon-footer">
              {productData.rating && (
                <span className="product-amazon-rating">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                  </svg>
                  {productData.rating}
                  {productData.reviewCount && <span className="review-count">({productData.reviewCount})</span>}
                </span>
              )}
              <span className="product-amazon-badge">[{citationIndex}]</span>
            </div>
          </div>
        </div>
      )}

      {/* OPTION B: Product Carousel Item */}
      {activeLayout === 'carousel' && (
        <div className="carousel-item" onClick={handleOpenModal}>
          <div className="carousel-image">
            {productData.image ? (
              <img src={productData.image} alt={productData.title} />
            ) : (
              <div className="carousel-image-placeholder">
                <svg viewBox="0 0 24 24" fill="currentColor" width="40" height="40">
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                </svg>
              </div>
            )}
          </div>
          <div className="carousel-info">
            <div className="carousel-title">{productData.title}</div>
            {productData.brand && (
              <div className="carousel-brand">{productData.brand}</div>
            )}
            {productData.price && (
              <div className="carousel-price">
                {productData.currency} {productData.price}
              </div>
            )}
            <div className="carousel-badge">[{citationIndex}]</div>
          </div>
        </div>
      )}

      {/* OPTION C: Vertical Mini-Card */}
      {activeLayout === 'vertical' && (
        <div className="product-card-vertical" onClick={handleOpenModal}>
          <div className="product-mini-image">
            {productData.image ? (
              <img src={productData.image} alt={productData.title} />
            ) : (
              <div className="product-mini-placeholder">
                <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                </svg>
              </div>
            )}
          </div>
          <div className="product-mini-content">
            <div className="product-mini-title">{productData.title}</div>
            {productData.brand && (
              <div className="product-mini-brand">{productData.brand}</div>
            )}
            <div className="product-mini-meta">
              {productData.price && (
                <span className="product-mini-price">
                  {productData.currency} {productData.price}
                </span>
              )}
              <span className="product-mini-badge">[{citationIndex}]</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        allProducts={allProducts}
        initialIndex={citationIndex - 1}
        totalProducts={totalProducts}
      />
    </>
  );
};

export default ProductPreviewDemo;
