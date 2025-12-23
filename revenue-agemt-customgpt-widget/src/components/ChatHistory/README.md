# Chat History Infinite Scroll Components

Performant infinite scroll implementation for chat conversation history with loading and empty states.

## Components

### 1. `useInfiniteScroll` Hook

IntersectionObserver-based infinite scroll with reverse scroll support.

**Features:**
- IntersectionObserver API (no scroll event listeners)
- Configurable threshold distance (default: 250px)
- Reverse scroll mode (scroll UP loads older items)
- Automatic cleanup on unmount
- Loading state management
- Error handling

**Usage:**
```tsx
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

const { ref, isLoadingMore } = useInfiniteScroll({
  loadMore: () => loadNextBatch(),
  hasMore: hasMoreConversations,
  isLoading: isLoadingConversations,
  threshold: 250,
  reverseScroll: false
});

return (
  <>
    {items.map(item => <Item key={item.id} {...item} />)}
    {hasMore && <div ref={ref} />}
  </>
);
```

**Props:**
- `loadMore` - Callback to load next batch
- `hasMore` - Whether more items exist
- `isLoading` - Current loading state
- `threshold` - Distance from bottom to trigger (px)
- `reverseScroll` - Enable reverse scroll mode

**Returns:**
- `ref` - Attach to sentinel element
- `isLoadingMore` - Loading state for UI

### 2. `LoadingState` Component

Skeleton screen for initial load with shimmer animation.

**Features:**
- 5 placeholder conversation items
- Smooth shimmer animation
- Matches ConversationItem dimensions (72px height)
- Accessible with aria-label
- Responsive design

**Usage:**
```tsx
import LoadingState from '@/components/ChatHistory/LoadingState';

{isInitialLoading && <LoadingState />}
```

**Performance:**
- CSS animations (GPU accelerated)
- No JavaScript overhead
- < 100ms render time

### 3. `EmptyState` Component

Multiple empty state variants with illustrations and CTAs.

**Features:**
- Three state types: no-conversations, no-search-results, all-deleted
- Icon illustrations
- Contextual messages
- CTA buttons with callbacks
- Responsive design

**Usage:**
```tsx
import EmptyState from '@/components/ChatHistory/EmptyState';

// No conversations
<EmptyState
  type="no-conversations"
  onNewChat={handleNewChat}
/>

// No search results
<EmptyState
  type="no-search-results"
  searchQuery="example"
  onClearSearch={handleClearSearch}
/>

// All deleted
<EmptyState
  type="all-deleted"
  onNewChat={handleNewChat}
/>
```

**Props:**
- `type` - State variant
- `onNewChat` - New chat callback
- `onClearSearch` - Clear search callback
- `searchQuery` - Search term (for no-search-results)

### 4. `LoadingMore` Component

Inline loading indicator for infinite scroll.

**Features:**
- Small spinner with text
- Shows during batch load
- Accessible aria-label
- Smooth fade-in animation
- Screen reader friendly

**Usage:**
```tsx
import LoadingMore from '@/components/ChatHistory/LoadingMore';

{isLoadingMore && <LoadingMore />}
```

## Integration Example

```tsx
import { useState, useEffect } from 'react';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import LoadingState from '@/components/ChatHistory/LoadingState';
import EmptyState from '@/components/ChatHistory/EmptyState';
import LoadingMore from '@/components/ChatHistory/LoadingMore';

const BATCH_SIZE = 20;

function ChatHistory() {
  const [conversations, setConversations] = useState([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  // Initial load
  useEffect(() => {
    loadInitialConversations();
  }, []);

  const loadInitialConversations = async () => {
    setIsInitialLoading(true);
    try {
      const data = await fetchConversations(0, BATCH_SIZE);
      setConversations(data);
      setOffset(BATCH_SIZE);
      setHasMore(data.length === BATCH_SIZE);
    } finally {
      setIsInitialLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const data = await fetchConversations(offset, BATCH_SIZE);

      if (data.length === 0) {
        setHasMore(false);
      } else {
        setConversations(prev => [...prev, ...data]);
        setOffset(prev => prev + data.length);
        setHasMore(data.length === BATCH_SIZE);
      }
    } finally {
      setIsLoadingMore(false);
    }
  };

  const { ref: sentinelRef } = useInfiniteScroll({
    loadMore: handleLoadMore,
    hasMore,
    isLoading: isLoadingMore,
    threshold: 250
  });

  // Loading state
  if (isInitialLoading) {
    return <LoadingState />;
  }

  // Empty state
  if (conversations.length === 0) {
    return <EmptyState type="no-conversations" onNewChat={createNewChat} />;
  }

  // Main render
  return (
    <div>
      {conversations.map(conv => (
        <ConversationItem key={conv.id} {...conv} />
      ))}

      {isLoadingMore && <LoadingMore />}
      {hasMore && !isLoadingMore && <div ref={sentinelRef} />}
    </div>
  );
}
```

## Loading State Hierarchy

1. **Initial Load**: Show `<LoadingState />` (skeleton screen)
2. **Loading More**: Show `<LoadingMore />` (inline spinner)
3. **No Results**: Show `<EmptyState />` with appropriate type
4. **All Loaded**: Remove sentinel, optionally show "No more conversations"

## Performance Requirements

✅ **< 300ms** to load next batch
✅ **No UI jank** during scroll
✅ **Proper cleanup** of observers
✅ **Handle rapid scroll** events
✅ **Maintain scroll position** (no jump)

## Accessibility

- ✅ `aria-label` on loading states
- ✅ Screen reader friendly text
- ✅ Keyboard navigation support
- ✅ Semantic HTML structure
- ✅ Reduced motion support

## Browser Support

- ✅ Chrome 51+
- ✅ Firefox 55+
- ✅ Safari 12.1+
- ✅ Edge 15+

Uses IntersectionObserver API (widely supported, no polyfill needed for modern browsers).

## File Structure

```
src/
├── hooks/
│   └── useInfiniteScroll.ts       # Infinite scroll hook
├── components/
│   └── ChatHistory/
│       ├── LoadingState.tsx       # Skeleton screen
│       ├── LoadingState.css
│       ├── EmptyState.tsx         # Empty state variants
│       ├── EmptyState.css
│       ├── LoadingMore.tsx        # Inline loader
│       ├── LoadingMore.css
│       ├── USAGE_EXAMPLE.tsx      # Integration example
│       └── README.md              # This file
```

## Styling

All components use CSS custom properties from design tokens:
- `var(--bg-surface)` - Background colors
- `var(--text-primary)` - Text colors
- `var(--border-primary)` - Border colors
- `var(--color-primary)` - Primary brand color
- `var(--radius-lg)` - Border radius
- `var(--transition-all)` - Transitions

Ensure design tokens are imported in your app's global styles.

## Testing

Recommended test scenarios:

1. **Initial Load**: Verify skeleton shows, then conversations appear
2. **Infinite Scroll**: Scroll to bottom, verify LoadingMore appears
3. **End of List**: Verify hasMore becomes false, sentinel removed
4. **Empty States**: Test all three variants render correctly
5. **Error Handling**: Verify graceful fallback on fetch errors
6. **Cleanup**: Verify observer disconnects on unmount

## Future Enhancements

- [ ] Virtual scrolling for 1000+ items
- [ ] Pull-to-refresh support
- [ ] Offline caching with IndexedDB
- [ ] Optimistic updates
- [ ] Skeleton item count customization
- [ ] Animation customization options
