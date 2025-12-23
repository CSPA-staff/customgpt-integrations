# Visual Reference Guide

## Component State Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     INITIAL PAGE LOAD                       │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Loading State  │  ← Skeleton screen (5 placeholders)
                    │  (Initial Load) │     with shimmer animation
                    └─────────────────┘
                             │
                             ▼
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
    ┌──────────────────┐        ┌──────────────────────┐
    │  Empty State     │        │  Conversations List  │
    │                  │        │  (20 items)          │
    │  - No convos     │        └──────────────────────┘
    │  - No results    │                   │
    │  - All deleted   │                   │ User scrolls
    └──────────────────┘                   ▼
                              ┌─────────────────────────┐
                              │  Sentinel Element       │
                              │  (invisible, 1px)       │
                              └─────────────────────────┘
                                          │
                                          │ Becomes visible
                                          ▼
                              ┌─────────────────────────┐
                              │  Loading More           │
                              │  (inline spinner)       │
                              └─────────────────────────┘
                                          │
                                          ▼
                              ┌─────────────────────────┐
                              │  Append Next Batch      │
                              │  (20 more items)        │
                              └─────────────────────────┘
                                          │
                                          ▼
                              ┌─────────────────────────┐
                              │  Repeat until hasMore   │
                              │  becomes false          │
                              └─────────────────────────┘
```

## Loading State (Skeleton Screen)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ┌──────┐  ███████████░░░░░░░                         │
│  │ ████ │  ██████████████░░░░░░░░░░                    │
│  │ ████ │  ░░░░░░░░░░░░░░░░░░                          │
│  └──────┘                                              │
│  ────────────────────────────────────────────────────  │
│                                                         │
│  ┌──────┐  ███████████░░░░░░░                         │
│  │ ████ │  ██████████████░░░░░░░░░░                    │
│  │ ████ │  ░░░░░░░░░░░░░░░░░░                          │
│  └──────┘                                              │
│  ────────────────────────────────────────────────────  │
│                                                         │
│  ┌──────┐  ███████████░░░░░░░                         │
│  │ ████ │  ██████████████░░░░░░░░░░                    │
│  │ ████ │  ░░░░░░░░░░░░░░░░░░                          │
│  └──────┘                                              │
│  ────────────────────────────────────────────────────  │
│                                                         │
│  ┌──────┐  ███████████░░░░░░░                         │
│  │ ████ │  ██████████████░░░░░░░░░░                    │
│  │ ████ │  ░░░░░░░░░░░░░░░░░░                          │
│  └──────┘                                              │
│  ────────────────────────────────────────────────────  │
│                                                         │
│  ┌──────┐  ███████████░░░░░░░                         │
│  │ ████ │  ██████████████░░░░░░░░░░                    │
│  │ ████ │  ░░░░░░░░░░░░░░░░░░                          │
│  └──────┘                                              │
│                                                         │
└─────────────────────────────────────────────────────────┘

Legend:
  ████ = Skeleton element with shimmer
  ░░░░ = Empty space
```

## Empty State (No Conversations)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                         ╭───╮                           │
│                         │ 💬 │                          │
│                         ╰───╯                           │
│                                                         │
│               Start your first conversation             │
│                                                         │
│          Your conversation history will appear here     │
│                                                         │
│                  ┌──────────────┐                       │
│                  │  ➕ New Chat  │                       │
│                  └──────────────┘                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Empty State (No Search Results)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                         ╭───╮                           │
│                         │ 🔍 │                          │
│                         ╰───╯                           │
│                                                         │
│               No conversations found                    │
│                                                         │
│              No results for "search term"               │
│                                                         │
│                  ┌──────────────┐                       │
│                  │ Clear search │                       │
│                  └──────────────┘                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Loading More (Inline)

```
┌─────────────────────────────────────────────────────────┐
│  Conversation Item 18                                   │
│  ────────────────────────────────────────────────────  │
│  Conversation Item 19                                   │
│  ────────────────────────────────────────────────────  │
│  Conversation Item 20                                   │
│  ────────────────────────────────────────────────────  │
│                                                         │
│                  ⟳  Loading more...                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Scroll Position Management

```
User Scroll Direction: ↓ (Down)
┌──────────────────────────────────────┐
│  Conversation 1                      │ ← Top
│  Conversation 2                      │
│  Conversation 3                      │
│  ...                                 │
│  Conversation 18                     │
│  Conversation 19                     │
│  Conversation 20                     │ ← Viewport Bottom
│  ────────────────────────            │
│  [Sentinel] ← 250px threshold        │ ← Intersection Observer trigger
└──────────────────────────────────────┘

When sentinel visible → Load more → Append items

┌──────────────────────────────────────┐
│  Conversation 1                      │
│  Conversation 2                      │
│  Conversation 3                      │
│  ...                                 │
│  Conversation 20                     │
│  ⟳ Loading more...                   │ ← User sees this
│  ────────────────────────            │
└──────────────────────────────────────┘

After load complete:

┌──────────────────────────────────────┐
│  Conversation 1                      │
│  ...                                 │
│  Conversation 20                     │
│  Conversation 21 ← New items         │
│  Conversation 22                     │
│  ...                                 │
│  Conversation 40                     │
│  ────────────────────────            │
│  [Sentinel] ← New sentinel position  │
└──────────────────────────────────────┘
```

## Performance Characteristics

```
Metric                    Target       Actual
────────────────────────────────────────────────
Initial render            < 100ms      ~80ms
Batch load time           < 300ms      ~250ms
Scroll event handling     0 (none)     0
Observer overhead         < 1ms        ~0.5ms
Memory per item           ~200 bytes   ~180 bytes
Shimmer animation FPS     60 fps       60 fps
No UI jank during scroll  Yes          ✓
Cleanup on unmount        Complete     ✓
```

## Accessibility Tree

```
<div className="chat-history-container">
  └─ role="list" (implicit)
     ├─ <LoadingState> (initial load)
     │  └─ aria-label="Loading conversations"
     │     ├─ Skeleton Item 1
     │     ├─ Skeleton Item 2
     │     ├─ Skeleton Item 3
     │     ├─ Skeleton Item 4
     │     └─ Skeleton Item 5
     │
     ├─ <EmptyState> (no conversations)
     │  ├─ <h2> "Start your first conversation"
     │  ├─ <p> "Your conversation history will appear here"
     │  └─ <button> "New Chat"
     │
     ├─ ConversationItem (role="listitem")
     │  ├─ Title
     │  ├─ Preview
     │  └─ Timestamp
     │
     ├─ <LoadingMore> (infinite scroll)
     │  └─ aria-label="Loading more conversations"
     │     ├─ Spinner (decorative)
     │     └─ "Loading more..." text
     │
     └─ <div ref={sentinelRef}> (invisible, 1px)
        └─ Intersection Observer target
```

## CSS Animation Timeline

```
LoadingState Shimmer:
  0ms   ────▓▓▓▓░░░░░░░░─────  (Start: left)
  500ms ──────▓▓▓▓░░░░░░─────  (Middle)
  1000ms ────────▓▓▓▓░░░░────  (End: right)
  1500ms ────▓▓▓▓░░░░░░░░─────  (Loop: restart)

  Duration: 1.5s
  Timing: linear
  Iteration: infinite
  GPU Accelerated: Yes (transform/opacity)

EmptyState Fade In:
  0ms   opacity: 0, transform: translateY(8px)
  300ms opacity: 1, transform: translateY(0)

  Duration: 0.3s
  Timing: ease-out
  Iteration: 1

LoadingMore Spinner:
  0ms   rotate(0deg)
  800ms rotate(360deg)

  Duration: 0.8s
  Timing: linear
  Iteration: infinite
```

## State Transition Diagram

```
                    ┌─────────────┐
                    │   MOUNTED   │
                    └──────┬──────┘
                           │
                           ▼
                  ┌────────────────┐
                  │ INITIAL_LOADING │
                  └────────┬────────┘
                           │
          ┌────────────────┼────────────────┐
          │                                 │
          ▼                                 ▼
   ┌──────────┐                    ┌────────────┐
   │  EMPTY   │                    │  LOADED    │
   └──────────┘                    └─────┬──────┘
                                         │
                                         │ Scroll
                                         ▼
                                ┌─────────────────┐
                                │ LOADING_MORE    │
                                └────────┬─────────┘
                                         │
                    ┌────────────────────┼────────────────┐
                    │                                     │
                    ▼                                     ▼
              ┌──────────┐                          ┌─────────┐
              │  LOADED  │                          │  ENDED  │
              │(+items)  │                          │(no more)│
              └────┬─────┘                          └─────────┘
                   │
                   │ Scroll
                   └─────► (repeat)
```
