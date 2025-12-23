import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardNavigationOptions {
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onEnter?: () => void;
  onEscape?: () => void;
  onDelete?: () => void;
  onNewConversation?: () => void;
  onFocusSearch?: () => void;
  onShowShortcuts?: () => void;
  enabled?: boolean;
  trapFocus?: boolean;
}

export interface KeyboardShortcut {
  key: string;
  description: string;
  modifier?: 'cmd' | 'ctrl' | 'shift';
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { key: 'K', modifier: 'cmd', description: 'Focus search' },
  { key: 'N', modifier: 'cmd', description: 'New conversation' },
  { key: '/', modifier: 'cmd', description: 'Show keyboard shortcuts' },
  { key: 'ArrowUp', description: 'Previous conversation' },
  { key: 'ArrowDown', description: 'Next conversation' },
  { key: 'Enter', description: 'Open conversation' },
  { key: 'Delete', description: 'Delete conversation' },
  { key: 'Escape', description: 'Close drawer/modal' },
];

/**
 * Hook for keyboard navigation in chat history
 * Handles arrow navigation, shortcuts, and focus management
 */
export function useKeyboardNavigation(options: KeyboardNavigationOptions) {
  const {
    onArrowUp,
    onArrowDown,
    onEnter,
    onEscape,
    onDelete,
    onNewConversation,
    onFocusSearch,
    onShowShortcuts,
    enabled = true,
    trapFocus = false,
  } = options;

  const containerRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? event.metaKey : event.ctrlKey;

      // Cmd/Ctrl + K: Focus search
      if (cmdOrCtrl && event.key === 'k') {
        event.preventDefault();
        onFocusSearch?.();
        return;
      }

      // Cmd/Ctrl + N: New conversation
      if (cmdOrCtrl && event.key === 'n') {
        event.preventDefault();
        onNewConversation?.();
        return;
      }

      // Cmd/Ctrl + /: Show shortcuts
      if (cmdOrCtrl && event.key === '/') {
        event.preventDefault();
        onShowShortcuts?.();
        return;
      }

      // Don't handle other shortcuts if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        // Only allow Escape in inputs
        if (event.key === 'Escape') {
          event.preventDefault();
          (event.target as HTMLElement).blur();
          onEscape?.();
        }
        return;
      }

      // Arrow Up: Previous conversation
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        onArrowUp?.();
        return;
      }

      // Arrow Down: Next conversation
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        onArrowDown?.();
        return;
      }

      // Enter: Open conversation
      if (event.key === 'Enter') {
        event.preventDefault();
        onEnter?.();
        return;
      }

      // Delete: Delete conversation
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        onDelete?.();
        return;
      }

      // Escape: Close drawer/modal
      if (event.key === 'Escape') {
        event.preventDefault();
        onEscape?.();
        return;
      }
    },
    [
      enabled,
      onArrowUp,
      onArrowDown,
      onEnter,
      onEscape,
      onDelete,
      onNewConversation,
      onFocusSearch,
      onShowShortcuts,
    ]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);

  return { containerRef };
}

/**
 * Hook for managing focus within a list of items
 * Handles arrow key navigation and Enter to select
 */
export function useListNavigation<T extends HTMLElement = HTMLElement>({
  items,
  selectedIndex,
  onSelect,
  enabled = true,
  loop = true,
}: {
  items: T[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  enabled?: boolean;
  loop?: boolean;
}) {
  const moveFocus = useCallback(
    (direction: 'up' | 'down') => {
      if (items.length === 0) return;

      let newIndex = selectedIndex;

      if (direction === 'up') {
        newIndex = selectedIndex > 0 ? selectedIndex - 1 : loop ? items.length - 1 : 0;
      } else {
        newIndex = selectedIndex < items.length - 1 ? selectedIndex + 1 : loop ? 0 : items.length - 1;
      }

      onSelect(newIndex);
      items[newIndex]?.focus();
    },
    [items, selectedIndex, onSelect, loop]
  );

  const handleArrowUp = useCallback(() => {
    if (!enabled) return;
    moveFocus('up');
  }, [enabled, moveFocus]);

  const handleArrowDown = useCallback(() => {
    if (!enabled) return;
    moveFocus('down');
  }, [enabled, moveFocus]);

  return {
    handleArrowUp,
    handleArrowDown,
  };
}

/**
 * Returns the keyboard shortcut display text based on platform
 */
export function getShortcutDisplay(shortcut: KeyboardShortcut): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  let prefix = '';
  if (shortcut.modifier === 'cmd') {
    prefix = isMac ? '⌘' : 'Ctrl+';
  } else if (shortcut.modifier === 'ctrl') {
    prefix = 'Ctrl+';
  } else if (shortcut.modifier === 'shift') {
    prefix = 'Shift+';
  }

  return `${prefix}${shortcut.key}`;
}

/**
 * Announce message to screen readers using ARIA live region
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}
