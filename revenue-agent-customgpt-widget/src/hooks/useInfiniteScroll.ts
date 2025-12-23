/**
 * useInfiniteScroll Hook
 *
 * IntersectionObserver-based infinite scroll implementation with reverse scroll support.
 * Optimized for chat history loading with proper cleanup and performance.
 */

import { useEffect, useRef, useCallback } from 'react';

export interface UseInfiniteScrollOptions {
  /** Callback to load more items */
  loadMore: () => void | Promise<void>;
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Whether currently loading */
  isLoading: boolean;
  /** Distance from bottom to trigger load (px) */
  threshold?: number;
  /** Enable reverse scroll mode (scroll UP loads older) */
  reverseScroll?: boolean;
}

export interface UseInfiniteScrollReturn {
  /** Ref to attach to sentinel element */
  ref: (node: HTMLElement | null) => void;
  /** Whether currently loading more items */
  isLoadingMore: boolean;
}

/**
 * Infinite scroll hook using IntersectionObserver
 *
 * @example
 * ```tsx
 * const { ref, isLoadingMore } = useInfiniteScroll({
 *   loadMore: () => loadNextBatch(),
 *   hasMore: hasMoreConversations,
 *   isLoading: isLoadingConversations,
 *   threshold: 250,
 *   reverseScroll: true
 * });
 *
 * return (
 *   <div>
 *     {items.map(item => <Item key={item.id} {...item} />)}
 *     {hasMore && <div ref={ref} />}
 *     {isLoadingMore && <LoadingMore />}
 *   </div>
 * );
 * ```
 */
export function useInfiniteScroll({
  loadMore,
  hasMore,
  isLoading,
  threshold = 250,
  reverseScroll = false
}: UseInfiniteScrollOptions): UseInfiniteScrollReturn {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef(false);

  // Callback for when sentinel element is visible
  const handleIntersect = useCallback(
    async (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;

      // Only trigger if:
      // 1. Sentinel is visible
      // 2. Not currently loading
      // 3. Has more items to load
      if (entry.isIntersecting && !loadingRef.current && !isLoading && hasMore) {
        loadingRef.current = true;

        try {
          await loadMore();
        } catch (error) {
          console.error('[useInfiniteScroll] Load more failed:', error);
        } finally {
          loadingRef.current = false;
        }
      }
    },
    [loadMore, isLoading, hasMore]
  );

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, []);

  // Ref callback to attach observer to sentinel element
  const setRef = useCallback(
    (node: HTMLElement | null) => {
      // Disconnect previous observer
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      // Create new observer if node exists
      if (node) {
        const options: IntersectionObserverInit = {
          root: null, // Use viewport
          rootMargin: reverseScroll ? `${threshold}px 0px 0px 0px` : `0px 0px ${threshold}px 0px`,
          threshold: 0.1
        };

        observerRef.current = new IntersectionObserver(handleIntersect, options);
        observerRef.current.observe(node);
      }
    },
    [handleIntersect, threshold, reverseScroll]
  );

  return {
    ref: setRef,
    isLoadingMore: loadingRef.current || isLoading
  };
}
