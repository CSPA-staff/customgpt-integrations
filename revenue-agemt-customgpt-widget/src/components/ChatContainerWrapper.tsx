'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import ChatContainer from './ChatContainer';
import { SystemCapabilities } from '@/hooks/useCapabilities';
import {
  saveConversationToDb,
  getConversation,
  generateConversationTitle,
  updateConversationMetadata,
  Conversation,
} from '@/lib/conversationDb';

interface ChatContainerWrapperProps {
  onVoiceMode: () => void;
  theme: 'light' | 'dark';
  capabilities: SystemCapabilities;
  activeSessionId: string | null;
  onSessionCreated: (sessionId: string) => void;
}

/**
 * Wrapper component that adds conversation tracking and IndexedDB persistence
 * to the existing ChatContainer component without modifying it.
 */
const ChatContainerWrapper = ({
  onVoiceMode,
  theme,
  capabilities,
  activeSessionId,
  onSessionCreated,
}: ChatContainerWrapperProps) => {
  const [messageCount, setMessageCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const conversationRef = useRef<Conversation | null>(null);
  const sessionIdRef = useRef<string | null>(activeSessionId);

  // Update ref when activeSessionId changes
  useEffect(() => {
    sessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  // Load existing conversation metadata when session changes
  useEffect(() => {
    const loadConversationMetadata = async () => {
      if (!activeSessionId) {
        conversationRef.current = null;
        setMessageCount(0);
        setIsInitialized(false);
        return;
      }

      try {
        const existing = await getConversation(activeSessionId);
        conversationRef.current = existing;
        setMessageCount(existing?.messageCount || 0);
        setIsInitialized(true);
      } catch (error) {
        console.error('[ChatWrapper] Failed to load conversation metadata:', error);
        setIsInitialized(true);
      }
    };

    loadConversationMetadata();
  }, [activeSessionId]);

  // Monitor DOM mutations to track message changes
  useEffect(() => {
    if (!activeSessionId || !isInitialized) return;

    // Create a MutationObserver to watch for message changes
    const observer = new MutationObserver(
      debounce(async () => {
        await updateConversationFromDOM();
      }, 1000)
    );

    // Find the chat messages container
    const messagesContainer = document.querySelector('.chat-messages');
    if (messagesContainer) {
      observer.observe(messagesContainer, {
        childList: true,
        subtree: true,
      });
    }

    return () => observer.disconnect();
  }, [activeSessionId, isInitialized]);

  // Update conversation metadata from DOM
  const updateConversationFromDOM = async () => {
    const currentSessionId = sessionIdRef.current;
    if (!currentSessionId) return;

    try {
      // Count messages in DOM
      const messageElements = document.querySelectorAll('.message.user, .message.assistant');
      const newMessageCount = Math.floor(messageElements.length / 2); // Divide by 2 (user + assistant pairs)

      if (newMessageCount === messageCount) return; // No change

      // Get last user message for preview
      const userMessages = document.querySelectorAll('.message.user .message-content');
      const lastUserMessage = userMessages[userMessages.length - 1];
      const lastMessage = lastUserMessage?.textContent?.trim().substring(0, 100);

      // Generate title from first message if this is a new conversation
      let title: string | undefined;
      if (!conversationRef.current && userMessages.length > 0) {
        const firstMessage = userMessages[0]?.textContent?.trim() || '';
        title = generateConversationTitle(firstMessage);
      }

      // Check if conversation exists in DB
      const existing = await getConversation(currentSessionId);

      if (existing) {
        // Update existing conversation
        await updateConversationMetadata(currentSessionId, {
          messageCount: newMessageCount,
          lastMessage,
        });
      } else {
        // Create new conversation entry
        const newConversation: Conversation = {
          id: currentSessionId,
          title: title || 'New Conversation',
          messageCount: newMessageCount,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastMessage,
        };
        await saveConversationToDb(newConversation);
        conversationRef.current = newConversation;
      }

      setMessageCount(newMessageCount);
    } catch (error) {
      console.error('[ChatWrapper] Failed to update conversation:', error);
    }
  };

  // Debounce helper
  function debounce(func: Function, wait: number) {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Listen for conversation creation events from ChatContainer
  useEffect(() => {
    const handleConversationCreated = async (event: CustomEvent) => {
      const newSessionId = event.detail.session_id;
      console.log('[ChatWrapper] New conversation created:', newSessionId);

      // Save initial conversation metadata
      const newConversation: Conversation = {
        id: newSessionId,
        title: 'New Conversation',
        messageCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await saveConversationToDb(newConversation);
      conversationRef.current = newConversation;
      onSessionCreated(newSessionId);
    };

    window.addEventListener('conversation:created' as any, handleConversationCreated);

    return () => {
      window.removeEventListener('conversation:created' as any, handleConversationCreated);
    };
  }, [onSessionCreated]);

  return (
    <ChatContainer
      onVoiceMode={onVoiceMode}
      theme={theme}
      capabilities={capabilities}
    />
  );
};

export default ChatContainerWrapper;
