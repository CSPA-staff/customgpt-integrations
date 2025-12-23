'use client';

import { useState, useEffect } from 'react';
import ProductPreviewDemo from './ProductPreviewDemo';
import ProductComparison from './ProductComparison';
import SourcePills from './SourcePills';
import { ProductData } from './ProductPreview';
import { PRODUCT_CONFIG } from '@/config/constants';
import './ProductPreviewDemo.css';

interface Citation {
  id: number | string;
  url: string;
  title: string;
  description?: string | null;
  image?: string | null;
}

interface ProductPreviewTabsProps {
  citations: Citation[];
}

type LayoutOption = 'horizontal' | 'carousel' | 'vertical' | 'pills';

// Cache for product data - persists across component renders
const productCache = new Map<string, ProductData>();

/**
 * Wrapper component that displays all products in the selected tab layout
 */
const GRID_PAGE_SIZE_FLOATING = 2; // 2 cards per page in floating/compact mode (matches 2 columns)
const GRID_PAGE_SIZE_MOBILE = 3; // 3 cards per page on mobile (matches 3 columns)
const GRID_PAGE_SIZE_DESKTOP = 4; // 4 cards per page on desktop (matches 4 columns)
const MOBILE_BREAKPOINT = 768; // Match CSS breakpoint

const ProductPreviewTabs = ({ citations }: ProductPreviewTabsProps) => {
  const [activeTab, setActiveTab] = useState<LayoutOption>('horizontal');
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  const [gridPageIndex, setGridPageIndex] = useState(0); // For Option A pagination
  const [productDataMap, setProductDataMap] = useState<Map<string, ProductData>>(new Map());
  const [loadingUrls, setLoadingUrls] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);
  const [isMobile, setIsMobile] = useState(false); // Track mobile/desktop for responsive pagination
  const [isFloating, setIsFloating] = useState(false); // Track floating/compact mode

  // Detect mobile/desktop and floating mode for responsive pagination
  useEffect(() => {
    const checkMode = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
      // Check if we're inside a floating panel (only true floating panel, not just compact mode on desktop)
      const isInFloatingPanel = !!document.querySelector('.widget-floating-panel');
      setIsFloating(isInFloatingPanel);
    };

    // Initial check
    checkMode();

    // Listen for resize
    window.addEventListener('resize', checkMode);

    // Also observe DOM changes for floating panel class changes
    const observer = new MutationObserver(checkMode);
    observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });

    return () => {
      window.removeEventListener('resize', checkMode);
      observer.disconnect();
    };
  }, []);

  // Get current page size based on mode:
  // - Floating panel: Always 2 columns (regardless of screen size)
  // - Desktop (≥768px): 4 columns
  // - Mobile: 3 columns
  const gridPageSize = isFloating
    ? GRID_PAGE_SIZE_FLOATING
    : (isMobile ? GRID_PAGE_SIZE_MOBILE : GRID_PAGE_SIZE_DESKTOP);

  // Fetch all product data on mount
  useEffect(() => {
    const fetchAllProducts = async () => {
      const urlsToFetch = citations.filter(c => !productCache.has(c.url)).map(c => c.url);

      if (urlsToFetch.length === 0) {
        // All products already cached
        setProductDataMap(new Map(productCache));
        return;
      }

      setLoadingUrls(new Set(urlsToFetch));

      // Fetch all products in parallel
      await Promise.all(
        urlsToFetch.map(async (url) => {
          try {
            const response = await fetch('/api/products/scrape', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url })
            });

            const result = await response.json();

            if (result.success && result.data) {
              productCache.set(url, result.data);
              setProductDataMap(prev => new Map(prev).set(url, result.data));
            } else {
              const citation = citations.find(c => c.url === url);
              const fallbackData: ProductData = {
                title: citation?.title || 'Product Details',
                url: url,
                description: 'Click to view product details'
              };
              productCache.set(url, fallbackData);
              setProductDataMap(prev => new Map(prev).set(url, fallbackData));
            }
          } catch (err) {
            const citation = citations.find(c => c.url === url);
            const fallbackData: ProductData = {
              title: citation?.title || 'Product Details',
              url: url,
              description: 'Click to view product details'
            };
            productCache.set(url, fallbackData);
            setProductDataMap(prev => new Map(prev).set(url, fallbackData));
          } finally {
            setLoadingUrls(prev => {
              const next = new Set(prev);
              next.delete(url);
              return next;
            });
          }
        })
      );
    };

    fetchAllProducts();
  }, [citations]);

  if (!citations || citations.length === 0) return null;

  const handlePrevCarousel = () => {
    setCurrentCarouselIndex((prev) => (prev === 0 ? citations.length - 1 : prev - 1));
  };

  const handleNextCarousel = () => {
    setCurrentCarouselIndex((prev) => (prev === citations.length - 1 ? 0 : prev + 1));
  };

  // Option A grid pagination handlers (responsive: 3 on mobile, 4 on desktop)
  const totalGridPages = Math.ceil(citations.length / gridPageSize);
  const hasMultipleGridPages = citations.length > gridPageSize;

  // Reset page index when screen size changes and current page would be out of bounds
  useEffect(() => {
    if (gridPageIndex >= totalGridPages && totalGridPages > 0) {
      setGridPageIndex(totalGridPages - 1);
    }
  }, [gridPageSize, totalGridPages, gridPageIndex]);

  const handlePrevGridPage = () => {
    setGridPageIndex((prev) => (prev === 0 ? totalGridPages - 1 : prev - 1));
  };

  const handleNextGridPage = () => {
    setGridPageIndex((prev) => (prev === totalGridPages - 1 ? 0 : prev + 1));
  };

  // Get current page of citations for Option A
  const getGridPageCitations = () => {
    const startIndex = gridPageIndex * gridPageSize;
    return citations.slice(startIndex, startIndex + gridPageSize);
  };

  const isLoading = loadingUrls.size > 0;

  // Create ordered array of all products for modal carousel
  const allProducts = citations.map(citation => productDataMap.get(citation.url)).filter(Boolean) as ProductData[];

  if (isLoading) {
    return (
      <div className="product-preview-tabs-wrapper">
        <div className="product-demo-loading">
          <div className="spinner-small">Loading products...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="product-preview-tabs-wrapper">
      {/* Tab Buttons - Shown Once */}
      <div className="demo-tabs">
        <button
          className={`demo-tab ${activeTab === 'horizontal' ? 'active' : ''}`}
          onClick={() => setActiveTab('horizontal')}
        >
          Option A
        </button>
        <button
          className={`demo-tab ${activeTab === 'carousel' ? 'active' : ''}`}
          onClick={() => setActiveTab('carousel')}
        >
          Option B
        </button>
        <button
          className={`demo-tab ${activeTab === 'vertical' ? 'active' : ''}`}
          onClick={() => setActiveTab('vertical')}
        >
          Option C
        </button>
        <button
          className={`demo-tab ${activeTab === 'pills' ? 'active' : ''}`}
          onClick={() => setActiveTab('pills')}
        >
          Option D
        </button>
        {/* Compare Button - Only show if we have 2+ products and comparison is enabled */}
        {PRODUCT_CONFIG.enableComparisonTable && citations.length >= 2 && (
          <button
            className={`demo-tab comparison-tab ${showComparison ? 'active' : ''}`}
            onClick={() => setShowComparison(!showComparison)}
            title="Compare all products"
          >
            Compare ({citations.length})
          </button>
        )}
      </div>

      {/* Option B: Carousel with Navigation */}
      {activeTab === 'carousel' ? (
        <div className="carousel-wrapper">
          {citations.length > 1 && (
            <button
              className="carousel-nav carousel-prev"
              onClick={handlePrevCarousel}
              aria-label="Previous"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
              </svg>
            </button>
          )}

          <div className="carousel-content">
            {productDataMap.get(citations[currentCarouselIndex].url) && (
              <ProductPreviewDemo
                citationUrl={citations[currentCarouselIndex].url}
                citationTitle={citations[currentCarouselIndex].title}
                citationIndex={currentCarouselIndex + 1}
                activeLayout="carousel"
                productData={productDataMap.get(citations[currentCarouselIndex].url)!}
                allProducts={allProducts}
                totalProducts={citations.length}
              />
            )}
          </div>

          {citations.length > 1 && (
            <button
              className="carousel-nav carousel-next"
              onClick={handleNextCarousel}
              aria-label="Next"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
              </svg>
            </button>
          )}

          {/* Carousel Indicators */}
          {citations.length > 1 && (
            <div className="carousel-indicators">
              {citations.map((_, index) => (
                <button
                  key={index}
                  className={`carousel-indicator ${index === currentCarouselIndex ? 'active' : ''}`}
                  onClick={() => setCurrentCarouselIndex(index)}
                  aria-label={`Go to product ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'horizontal' ? (
        /* Option A: Grid with pagination when >4 products */
        <div className="grid-carousel-wrapper">
          {hasMultipleGridPages && (
            <button
              className="grid-nav grid-nav-prev"
              onClick={handlePrevGridPage}
              aria-label="Previous products"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
              </svg>
            </button>
          )}

          <div className={`demo-products-grid layout-${activeTab}`}>
            {getGridPageCitations().map((citation) => {
              const productData = productDataMap.get(citation.url);
              if (!productData) return null;
              // Find the original index in full citations array
              const originalIndex = citations.findIndex(c => c.id === citation.id);

              return (
                <ProductPreviewDemo
                  key={citation.id}
                  citationUrl={citation.url}
                  citationTitle={citation.title}
                  citationIndex={originalIndex + 1}
                  activeLayout={activeTab}
                  productData={productData}
                  allProducts={allProducts}
                  totalProducts={citations.length}
                />
              );
            })}
          </div>

          {hasMultipleGridPages && (
            <button
              className="grid-nav grid-nav-next"
              onClick={handleNextGridPage}
              aria-label="Next products"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
              </svg>
            </button>
          )}

          {/* Page indicators */}
          {hasMultipleGridPages && (
            <div className="grid-page-indicators">
              {Array.from({ length: totalGridPages }).map((_, index) => (
                <button
                  key={index}
                  className={`grid-page-indicator ${index === gridPageIndex ? 'active' : ''}`}
                  onClick={() => setGridPageIndex(index)}
                  aria-label={`Go to page ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'pills' ? (
        /* Option D: Compact Pills View */
        <div className="pills-wrapper">
          <SourcePills
            citations={citations.map(c => ({
              id: typeof c.id === 'string' ? parseInt(c.id, 10) || 0 : c.id,
              url: c.url,
              title: c.title,
              description: c.description || null,
              image: c.image
            }))}
            maxVisible={10}
          />
        </div>
      ) : (
        /* Option C: All Products in Grid (no pagination) */
        <div className={`demo-products-grid layout-${activeTab}`}>
          {citations.map((citation, index) => {
            const productData = productDataMap.get(citation.url);
            if (!productData) return null;

            return (
              <ProductPreviewDemo
                key={citation.id}
                citationUrl={citation.url}
                citationTitle={citation.title}
                citationIndex={index + 1}
                activeLayout={activeTab}
                productData={productData}
                allProducts={allProducts}
                totalProducts={citations.length}
              />
            );
          })}
        </div>
      )}

      {/* Product Comparison View */}
      {PRODUCT_CONFIG.enableComparisonTable && showComparison && allProducts.length >= 2 && (
        <ProductComparison
          products={allProducts}
          onClose={() => setShowComparison(false)}
        />
      )}
    </div>
  );
};

export default ProductPreviewTabs;
