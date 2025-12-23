'use client';

import { useState, useEffect } from 'react';
import {
  getAllConversations,
  deleteConversation,
  Conversation,
} from '@/lib/conversationDb';
import './ChatHistorySidebar.css';

interface ChatHistorySidebarProps {
  activeConversationId: string | null;
  onConversationSelect: (conversationId: string) => void;
  onNewConversation: () => void;
  isCollapsed?: boolean;
  theme?: 'light' | 'dark';
  onThemeChange?: (theme: 'light' | 'dark') => void;
}

const ChatHistorySidebar = ({
  activeConversationId,
  onConversationSelect,
  onNewConversation,
  isCollapsed = false,
  theme = 'dark',
  onThemeChange,
}: ChatHistorySidebarProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const allConversations = await getAllConversations();
      setConversations(allConversations);
    } catch (error) {
      console.error('[ChatHistory] Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent conversation selection

    if (!confirm('Delete this conversation? This cannot be undone.')) {
      return;
    }

    setDeletingId(conversationId);

    try {
      await deleteConversation(conversationId);
      setConversations(prev => prev.filter(c => c.id !== conversationId));

      // If deleting active conversation, create new one
      if (conversationId === activeConversationId) {
        onNewConversation();
      }
    } catch (error) {
      console.error('[ChatHistory] Failed to delete conversation:', error);
      alert('Failed to delete conversation. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Refresh conversations when active conversation changes
  useEffect(() => {
    if (activeConversationId) {
      loadConversations();
    }
  }, [activeConversationId]);

  if (isCollapsed) {
    return null; // Don't render when collapsed (mobile)
  }

  return (
    <div className="chat-history-sidebar">
      <div className="sidebar-header">
        <h2>Chat History</h2>
        <button
          className="new-chat-button"
          onClick={onNewConversation}
          title="New conversation"
          aria-label="Start new conversation"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
        </button>
      </div>

      <div className="conversations-list">
        {loading && (
          <div className="loading-state">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" className="spinner">
              <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
            </svg>
            <span>Loading...</span>
          </div>
        )}

        {!loading && conversations.length === 0 && (
          <div className="empty-state">
            <p>No conversations yet</p>
            <button
              className="start-chat-button"
              onClick={onNewConversation}
            >
              Start a conversation
            </button>
          </div>
        )}

        {!loading && conversations.map((conversation) => (
          <div
            key={conversation.id}
            className={`conversation-item ${activeConversationId === conversation.id ? 'active' : ''}`}
            onClick={() => onConversationSelect(conversation.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onConversationSelect(conversation.id);
              }
            }}
          >
            <div className="conversation-content">
              <h3 className="conversation-title">{conversation.title}</h3>
              <div className="conversation-meta">
                <span className="message-count">
                  {conversation.messageCount} {conversation.messageCount === 1 ? 'message' : 'messages'}
                </span>
                <span className="timestamp">{formatTimestamp(conversation.updatedAt)}</span>
              </div>
              {conversation.lastMessage && (
                <p className="last-message">{conversation.lastMessage}</p>
              )}
            </div>
            <button
              className="delete-button"
              onClick={(e) => handleDelete(conversation.id, e)}
              disabled={deletingId === conversation.id}
              title="Delete conversation"
              aria-label="Delete conversation"
            >
              {deletingId === conversation.id ? (
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" className="spinner">
                  <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
              )}
            </button>
          </div>
        ))}
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
    </div>
  );
};

export default ChatHistorySidebar;
