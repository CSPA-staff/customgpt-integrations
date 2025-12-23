'use client';

import { useState, useEffect } from 'react';
import ProductModal from './ProductModal';
import './ProductPreview.css';

export interface ProductData {
  title: string;
  description?: string;
  image?: string;
  price?: string;
  currency?: string;
  availability?: string;
  brand?: string;
  rating?: string;
  reviewCount?: string;
  condition?: string;
  sku?: string;
  url: string;
}

interface ProductPreviewProps {
  citationUrl: string;
  citationTitle: string;
  citationIndex: number;
}

/**
 * Inline product preview button that appears within chat messages
 * Fetches product metadata and shows modal on click
 */
const ProductPreview = ({ citationUrl, citationTitle, citationIndex }: ProductPreviewProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch product data when component mounts or URL changes
   */
  useEffect(() => {
    fetchProductData();
  }, [citationUrl]);

  const fetchProductData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/products/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: citationUrl })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch product data');
      }

      const result = await response.json();

      if (result.success && result.data) {
        setProductData(result.data);
      } else {
        throw new Error(result.error || 'Failed to load product data');
      }
    } catch (err: any) {
      console.error('Product fetch error:', err);
      setError(err.message);
      // Fallback to basic data from citation
      setProductData({
        title: citationTitle,
        url: citationUrl,
        description: 'Click to view product details'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <button
        className="product-preview-button"
        onClick={handleOpenModal}
        disabled={isLoading}
        title={`View product: ${productData?.title || citationTitle}`}
      >
        {isLoading ? (
          <>
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" className="spinner">
              <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
            </svg>
            <span>Loading...</span>
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
              <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
            <span>{productData?.title || citationTitle}</span>
            <span className="preview-indicator">[{citationIndex}]</span>
          </>
        )}
      </button>

      {productData && (
        <ProductModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          allProducts={[productData]}
          initialIndex={0}
          totalProducts={1}
        />
      )}
    </>
  );
};

export default ProductPreview;
