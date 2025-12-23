'use client';

import React, { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import ConversationList from './ConversationList';
import NewChatButton from './NewChatButton';
import { ConversationItemData } from './ConversationItem';
import SkipLink from './SkipLink';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { announceToScreenReader } from '@/utils/a11y';
import './ChatHistory.css';

// Loading fallback component for Suspense
const ConversationListLoading = () => (
  <div className="conversation-list-loading" aria-live="polite" aria-busy="true">
    <div className="loading-spinner" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
    <p className="loading-text">Loading conversations...</p>
  </div>
);

interface ChatHistorySidebarProps {
  onConversationSelect: (id: string) => void;
  activeConversationId: string | null;
  conversations?: ConversationItemData[];
  onNewChat?: () => void;
  onLoadMore?: () => void;
  onDelete?: (sessionId: string) => Promise<void>;
  theme?: 'light' | 'dark';
  onThemeChange?: (theme: 'light' | 'dark') => void;
  /** Force compact/mobile mode regardless of viewport size (for floating widget) */
  compactMode?: boolean;
}

const STORAGE_KEY = 'chat_history_sidebar_collapsed';

const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
  onConversationSelect,
  activeConversationId,
  conversations = [],
  onNewChat,
  onLoadMore,
  onDelete,
  theme = 'dark',
  onThemeChange,
  compactMode = false
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [contextMenuConversation, setContextMenuConversation] = useState<ConversationItemData | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const mobileToggleRef = useRef<HTMLButtonElement>(null);

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setIsCollapsed(stored === 'true');
      }
    } catch (error) {
      console.error('[ChatHistory] Failed to load sidebar state:', error);
    }

    // Detect mobile/desktop
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Memoize toggle collapsed handler
  const toggleCollapsed = useCallback(() => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);

    try {
      localStorage.setItem(STORAGE_KEY, String(newState));
    } catch (error) {
      console.error('[ChatHistory] Failed to save sidebar state:', error);
    }
  }, [isCollapsed]);

  // Memoize conversation select handler
  const handleConversationSelect = useCallback((id: string) => {
    onConversationSelect(id);
    const conversation = conversations.find(c => c.id === id);
    if (conversation) {
      announceToScreenReader(`Opened conversation: ${conversation.title}`);
    }
    // Close mobile drawer after selection
    if (isMobile) {
      setIsMobileOpen(false);
    }
  }, [onConversationSelect, conversations, isMobile]);

  // Memoize new chat handler
  const handleNewChat = useCallback(() => {
    if (onNewChat) {
      onNewChat();
      announceToScreenReader('Started new conversation');
    }
    // Close mobile drawer after new chat
    if (isMobile) {
      setIsMobileOpen(false);
    }
  }, [onNewChat, isMobile]);

  // Memoize close mobile drawer handler
  const handleCloseMobileDrawer = useCallback(() => {
    setIsMobileOpen(false);
    // Return focus to toggle button
    setTimeout(() => {
      mobileToggleRef.current?.focus();
    }, 100);
  }, []);

  // Handle context menu (3-dot button)
  const handleContextMenu = useCallback((conversationId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      const target = event.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();

      // Calculate menu position
      // Default: position to the right of the button
      let x = rect.right + 8;
      let y = rect.top;

      // Adjust if menu would go off-screen
      const menuWidth = 150;
      const menuHeight = 80;

      if (x + menuWidth > window.innerWidth) {
        // Position to the left of the button instead
        x = rect.left - menuWidth - 8;
      }

      if (y + menuHeight > window.innerHeight) {
        // Position above the button instead
        y = rect.bottom - menuHeight;
      }

      setContextMenuConversation(conversation);
      setMenuPosition({ x, y });
    }
  }, [conversations]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!contextMenuConversation || !onDelete) return;

    try {
      const sessionId = contextMenuConversation.id;

      // Delete from server via API
      const response = await fetch(`/api/chat/conversations/${sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.warn('[ChatHistory] Server deletion failed:', errorData.error);
      } else {
        console.log('[ChatHistory] Successfully deleted conversation from server');
      }

      // Delete from IndexedDB and update local state via useConversationHistory hook
      // This will automatically update the sidebar and broadcast to other tabs
      await onDelete(sessionId);

      announceToScreenReader(`Deleted conversation: ${contextMenuConversation.title}`);
      setMenuPosition(null);
      setContextMenuConversation(null);
    } catch (error) {
      console.error('[ChatHistory] Failed to delete conversation:', error);
      announceToScreenReader('Failed to delete conversation');
    }
  }, [contextMenuConversation, onDelete]);

  // Note: Rename functionality removed - incomplete implementation causing build errors

  // Handle delete button click - delete immediately without confirmation
  const handleDeleteClick = useCallback(async () => {
    setMenuPosition(null);
    if (contextMenuConversation) {
      await handleDelete();
    }
  }, [contextMenuConversation, handleDelete]);

  // Close context menu when clicking outside
  useEffect(() => {
    if (!menuPosition) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.conversation-context-menu') && !target.closest('.conversation-context-menu-button')) {
        setMenuPosition(null);
        setContextMenuConversation(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuPosition]);

  // Focus trap for mobile drawer
  const { containerRef: focusTrapRef } = useFocusTrap({
    enabled: isMobileOpen && isMobile,
    returnFocusOnDeactivate: true,
    escapeDeactivates: true,
    onDeactivate: handleCloseMobileDrawer,
  });

  // Keyboard navigation
  useKeyboardNavigation({
    onEscape: () => {
      if (isMobileOpen) {
        handleCloseMobileDrawer();
      } else if (menuPosition) {
        setMenuPosition(null);
        setContextMenuConversation(null);
      }
    },
    onNewConversation: handleNewChat,
    enabled: true,
  });

  // Mobile or compact mode: Render as drawer
  // compactMode forces mobile layout regardless of viewport (for floating widget)
  if (isMobile || compactMode) {
    return (
      <>
        <SkipLink targetId="main-chat-area">Skip to conversation</SkipLink>

        {/* Mobile toggle button */}
        <button
          ref={mobileToggleRef}
          className="chat-history-mobile-toggle"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          aria-label={isMobileOpen ? 'Close chat history' : 'Open chat history'}
          aria-expanded={isMobileOpen}
          aria-controls="chat-history-drawer"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="20"
            height="20"
            aria-hidden="true"
          >
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Mobile overlay */}
        {isMobileOpen && (
          <div
            className="chat-history-overlay"
            onClick={handleCloseMobileDrawer}
            aria-hidden="true"
          />
        )}

        {/* Mobile drawer */}
        <aside
          id="chat-history-drawer"
          ref={(el) => {
            if (el) {
              (focusTrapRef as React.MutableRefObject<HTMLElement | null>).current = el;
            }
          }}
          className={`chat-history-sidebar mobile ${isMobileOpen ? 'open' : ''}`}
          role="navigation"
          aria-label="Chat history navigation"
          aria-hidden={!isMobileOpen}
        >
          <div className="chat-history-header">
            <h2 className="chat-history-title" id="chat-history-title">Chat History</h2>
            <button
              className="chat-history-close"
              onClick={handleCloseMobileDrawer}
              aria-label="Close chat history drawer"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                width="20"
                height="20"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="chat-history-actions">
            <NewChatButton onClick={handleNewChat} collapsed={false} />
          </div>

          <div className="chat-history-list-container">
            <Suspense fallback={<ConversationListLoading />}>
              <ConversationList
                conversations={conversations}
                activeConversationId={activeConversationId}
                onConversationSelect={handleConversationSelect}
                onContextMenu={handleContextMenu}
                onLoadMore={onLoadMore}
              />
            </Suspense>
          </div>

          {/* Theme Toggle at Bottom */}
          {onThemeChange && (
            <div className="theme-toggle-container">
              <span className={`theme-label ${theme === 'light' ? 'active' : ''}`}>Light</span>
              <button
                className={`theme-toggle-switch ${theme === 'light' ? 'light' : 'dark'}`}
                onClick={() => onThemeChange(theme === 'light' ? 'dark' : 'light')}
                title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                role="switch"
                aria-checked={theme === 'dark'}
              >
                <div className="theme-toggle-track">
                  <div className="theme-toggle-thumb" />
                </div>
              </button>
              <span className={`theme-label ${theme === 'dark' ? 'active' : ''}`}>Dark</span>
            </div>
          )}
        </aside>

        {/* Context Menu - Rendered outside sidebar to avoid overflow clipping */}
        {menuPosition && contextMenuConversation && (
          <div
            className="conversation-context-menu"
            style={{
              position: 'fixed',
              top: menuPosition.y,
              left: menuPosition.x,
              zIndex: 10000
            }}
          >
            <button
              className="context-menu-item danger"
              onClick={handleDeleteClick}
            >
              Delete
            </button>
          </div>
        )}
      </>
    );
  }

  // Desktop: Render as sidebar
  return (
    <>
      <SkipLink targetId="main-chat-area">Skip to conversation</SkipLink>

      <aside
        className={`chat-history-sidebar desktop ${isCollapsed ? 'collapsed' : ''}`}
        role="navigation"
        aria-label="Chat history navigation"
      >
        <div className="chat-history-header">
          {!isCollapsed && <h2 className="chat-history-title" id="chat-history-title">History</h2>}
          <button
            className="chat-history-toggle"
            onClick={toggleCollapsed}
            aria-label={isCollapsed ? 'Expand chat history sidebar' : 'Collapse chat history sidebar'}
            aria-expanded={!isCollapsed}
            aria-controls="chat-history-content"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="18"
              height="18"
              aria-hidden="true"
              style={{ transform: isCollapsed ? 'rotate(180deg)' : 'none' }}
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>

        <div className="chat-history-actions">
          <NewChatButton onClick={handleNewChat} collapsed={isCollapsed} />
        </div>

        {!isCollapsed && (
          <div id="chat-history-content" className="chat-history-list-container">
            <Suspense fallback={<ConversationListLoading />}>
              <ConversationList
                conversations={conversations}
                activeConversationId={activeConversationId}
                onConversationSelect={handleConversationSelect}
                onContextMenu={handleContextMenu}
                onLoadMore={onLoadMore}
              />
            </Suspense>
          </div>
        )}

        {/* Theme Toggle at Bottom */}
        {!isCollapsed && onThemeChange && (
          <div className="theme-toggle-container">
            <span className={`theme-label ${theme === 'light' ? 'active' : ''}`}>Light</span>
            <button
              className={`theme-toggle-switch ${theme === 'light' ? 'light' : 'dark'}`}
              onClick={() => onThemeChange(theme === 'light' ? 'dark' : 'light')}
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              role="switch"
              aria-checked={theme === 'dark'}
            >
              <div className="theme-toggle-track">
                <div className="theme-toggle-thumb" />
              </div>
            </button>
            <span className={`theme-label ${theme === 'dark' ? 'active' : ''}`}>Dark</span>
          </div>
        )}
      </aside>

      {/* Context Menu - Rendered outside sidebar to avoid overflow clipping */}
      {menuPosition && contextMenuConversation && (
        <div
          className="conversation-context-menu"
          style={{
            position: 'fixed',
            top: menuPosition.y,
            left: menuPosition.x,
            zIndex: 10000
          }}
        >
          <button
            className="context-menu-item danger"
            onClick={handleDeleteClick}
          >
            Delete
          </button>
        </div>
      )}
    </>
  );
};

export default ChatHistorySidebar;
