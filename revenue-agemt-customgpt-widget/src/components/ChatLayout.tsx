'use client';

import { useState, ReactNode, useEffect } from 'react';
import ChatHistorySidebar from './ChatHistory/ChatHistorySidebar';
import { useConversationHistory } from '@/hooks/useConversationHistory';
import { ConversationItemData } from './ChatHistory/ConversationItem';
import ErrorBoundary from './ErrorBoundary';
import './ChatLayout.css';

interface ChatLayoutProps {
  children: ReactNode;
  activeConversationId: string | null;
  onConversationSelect: (conversationId: string) => void;
  onNewConversation: () => void;
  theme?: 'light' | 'dark';
  onThemeChange?: (theme: 'light' | 'dark') => void;
  /** Force compact/mobile mode regardless of viewport size (for floating widget) */
  compactMode?: boolean;
}

const ChatLayout = ({
  children,
  activeConversationId,
  onConversationSelect,
  onNewConversation,
  theme,
  onThemeChange,
  compactMode = false,
}: ChatLayoutProps) => {
  const {
    conversations,
    loading,
    hasMore,
    loadMore,
    deleteConversation,
    refresh,
  } = useConversationHistory();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Listen for conversation updates via BroadcastChannel
  useEffect(() => {
    if (typeof window === 'undefined' || !window.BroadcastChannel) {
      return;
    }

    const channel = new BroadcastChannel('conversation_sync');

    const handleBroadcast = (event: MessageEvent) => {
      if (event.data?.type === 'conversation_updated') {
        console.log('[ChatLayout] Received conversation update broadcast, refreshing list');
        // Refresh the conversation list
        refresh();
      }
    };

    channel.addEventListener('message', handleBroadcast);

    return () => {
      channel.removeEventListener('message', handleBroadcast);
      channel.close();
    };
  }, [refresh]);

  const handleConversationSelect = (conversationId: string) => {
    onConversationSelect(conversationId);
    setIsDrawerOpen(false); // Close drawer on mobile after selection
  };

  const handleNewConversation = () => {
    onNewConversation();
    setIsDrawerOpen(false); // Close drawer on mobile after creating new chat
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadMore();
    }
  };

  // Convert conversations to ConversationItemData format
  const conversationItems: ConversationItemData[] = conversations.map((conv) => ({
    id: conv.sessionId,
    title: conv.title,
    timestamp: conv.updatedAt,
    messageCount: conv.messageCount,
  }));

  return (
    <div className="chat-layout">
      {/* Chat History Sidebar - handles mobile/desktop internally */}
      <ErrorBoundary
        fallback={
          <div style={{ padding: '1rem', color: 'var(--text-secondary, #666)' }}>
            Chat history unavailable
          </div>
        }
      >
        <ChatHistorySidebar
          activeConversationId={activeConversationId}
          onConversationSelect={handleConversationSelect}
          onNewChat={handleNewConversation}
          conversations={conversationItems}
          onLoadMore={hasMore ? handleLoadMore : undefined}
          onDelete={deleteConversation}
          theme={theme}
          onThemeChange={onThemeChange}
          compactMode={compactMode}
        />
      </ErrorBoundary>

      {/* Main Content */}
      <div className="main-content" id="main-chat-area">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default ChatLayout;
