'use client';

/**
 * ChatHistoryDemo Component
 *
 * Example implementation showing how to use:
 * - MobileDrawer
 * - HamburgerButton
 * - ConversationSwipeActions
 *
 * This is a demo component showing the integration.
 * Adapt this for your actual chat history implementation.
 */

import React, { useState } from 'react';
import MobileDrawer from './MobileDrawer';
import HamburgerButton from './HamburgerButton';
import ConversationSwipeActions from './ConversationSwipeActions';
import './MobileDrawer.css';

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
}

const ChatHistoryDemo: React.FC = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: '1',
      title: 'Product Recommendations',
      lastMessage: 'Can you suggest some laptops?',
      timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 mins ago
    },
    {
      id: '2',
      title: 'Shipping Question',
      lastMessage: 'How long does shipping take?',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    },
    {
      id: '3',
      title: 'Return Policy',
      lastMessage: 'What is your return policy?',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    },
    {
      id: '4',
      title: 'Technical Support',
      lastMessage: 'My order is not working',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
    },
  ]);

  const handleDeleteConversation = (id: string) => {
    setConversations((prev) => prev.filter((conv) => conv.id !== id));
  };

  const handleConversationClick = (id: string) => {
    console.log('Load conversation:', id);
    setIsDrawerOpen(false);
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="chat-history-demo">
      {/* Hamburger Button - Visible only on mobile */}
      <HamburgerButton
        isOpen={isDrawerOpen}
        onClick={() => setIsDrawerOpen(!isDrawerOpen)}
      />

      {/* Mobile Drawer */}
      <MobileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <h2 className="drawer-title">Conversations</h2>
          <button
            className="drawer-close-button"
            onClick={() => setIsDrawerOpen(false)}
            aria-label="Close drawer"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* Drawer Content - Conversation List */}
        <div className="drawer-content">
          {conversations.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: 'var(--space-8)',
                color: 'var(--text-secondary)',
              }}
            >
              <p>No conversations yet</p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <ConversationSwipeActions
                key={conversation.id}
                conversationId={conversation.id}
                onDelete={handleDeleteConversation}
              >
                <div
                  className="conversation-item"
                  onClick={() => handleConversationClick(conversation.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleConversationClick(conversation.id);
                    }
                  }}
                >
                  <div className="conversation-item-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
                    </svg>
                  </div>
                  <div className="conversation-item-content">
                    <h3 className="conversation-item-title">{conversation.title}</h3>
                    <p className="conversation-item-subtitle">
                      {conversation.lastMessage} · {formatTimestamp(conversation.timestamp)}
                    </p>
                  </div>
                </div>
              </ConversationSwipeActions>
            ))
          )}

          {/* New Conversation Button */}
          <button
            style={{
              width: '100%',
              padding: 'var(--space-3)',
              marginTop: 'var(--space-4)',
              background: 'var(--color-primary)',
              color: 'var(--text-inverse)',
              border: 'none',
              borderRadius: 'var(--radius-lg)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-medium)',
              cursor: 'pointer',
              transition: 'var(--transition-all)',
            }}
            onClick={() => {
              console.log('New conversation');
              setIsDrawerOpen(false);
            }}
          >
            + New Conversation
          </button>
        </div>
      </MobileDrawer>

      {/* Demo Instructions */}
      <div
        style={{
          padding: 'var(--space-5)',
          maxWidth: '600px',
          margin: '0 auto',
        }}
      >
        <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-4)' }}>
          Mobile Drawer Demo
        </h1>

        <div
          style={{
            background: 'var(--bg-surface)',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: 'var(--space-4)',
          }}
        >
          <h2 style={{ fontSize: 'var(--text-base)', marginBottom: 'var(--space-3)' }}>
            Features
          </h2>
          <ul style={{ fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
            <li>Tap hamburger button (☰) in top-left to open drawer</li>
            <li>Swipe right on drawer to close</li>
            <li>Tap backdrop to close</li>
            <li>Press Escape key to close</li>
            <li>Swipe left on conversations to reveal delete button</li>
            <li>Focus trap keeps Tab navigation within drawer</li>
            <li>Body scroll locked when drawer is open</li>
            <li>Haptic feedback on supported devices</li>
          </ul>
        </div>

        <div
          style={{
            background: 'var(--color-info-light)',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--text-sm)',
          }}
        >
          <strong>Note:</strong> This is a demonstration component. Integrate these
          components into your existing ChatContainer for full functionality.
        </div>
      </div>
    </div>
  );
};

export default ChatHistoryDemo;
