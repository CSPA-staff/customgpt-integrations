'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useCapabilities } from '@/hooks/useCapabilities';
import { WIDGET_CONFIG } from '@/config/constants';

// Dynamic imports to avoid SSR issues with window/document
const ChatContainer = dynamic(() => import('@/components/ChatContainer'), { ssr: false });
const VoiceMode = dynamic(() => import('@/components/VoiceMode'), { ssr: false });
const ChatLayout = dynamic(() => import('@/components/ChatLayout'), { ssr: false });
const ConversationSyncProvider = dynamic(
  () => import('@/components/ConversationSyncProvider').then(mod => ({ default: mod.ConversationSyncProvider })),
  { ssr: false }
);
const FloatingChatButton = dynamic(() => import('@/components/FloatingChatButton'), { ssr: false });
const WidgetWrapper = dynamic(() => import('@/components/WidgetWrapper'), { ssr: false });

export default function Home() {
  const [mode, setMode] = useState<'chat' | 'voice'>('chat');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [chatKey, setChatKey] = useState(0); // Force remount counter
  const [isChatOpen, setIsChatOpen] = useState(false); // For floating button mode
  const switchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastSwitchTimeRef = useRef<number>(0);

  // Widget configuration
  const {
    embedMode,
    floatingButton,
    floatingButtonPosition,
    // Embed mode dimensions
    embedWidth,
    embedHeight,
    embedMaxHeight,
    // Floating chatbot dimensions
    floatingWidth,
    floatingHeight,
    floatingMaxHeight,
  } = WIDGET_CONFIG;

  // Fetch system capabilities
  const { capabilities, loading, error } = useCapabilities();

  // Apply theme class to document.body
  useEffect(() => {
    document.body.classList.remove('light-theme', 'dark-theme');
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.add('light-theme');
    }
  }, [theme]);

  // Handle conversation selection with debouncing to prevent rapid switches
  const handleConversationSelect = useCallback(async (conversationId: string) => {
    const now = Date.now();
    const timeSinceLastSwitch = now - lastSwitchTimeRef.current;

    // Debounce: ignore switches within 300ms of each other
    if (timeSinceLastSwitch < 300) {
      console.log('[App] Debouncing conversation switch (too fast)');
      return;
    }

    // Clear any pending debounced switch
    if (switchDebounceRef.current) {
      clearTimeout(switchDebounceRef.current);
    }

    // Skip if already on this conversation
    if (activeConversationId === conversationId) {
      console.log('[App] Already on conversation:', conversationId);
      return;
    }

    lastSwitchTimeRef.current = now;
    console.log('[App] Switching to conversation:', conversationId);

    // Save selected conversation to localStorage so ChatContainer loads it
    if (typeof window !== 'undefined') {
      try {
        const { saveConversation } = await import('@/hooks/useConversationPersistence');
        saveConversation(conversationId);
      } catch (error) {
        console.error('[App] Failed to update localStorage:', error);
      }
    }

    // Batch state updates to prevent multiple re-renders
    // React 18+ batches these automatically, but being explicit helps clarity
    // Use functional updates to ensure we get the latest state
    setActiveConversationId(conversationId);
    setChatKey(prev => prev + 1);
  }, [activeConversationId]);

  // Handle new conversation creation with debouncing
  const handleNewConversation = useCallback(async () => {
    const now = Date.now();
    const timeSinceLastSwitch = now - lastSwitchTimeRef.current;

    // Debounce: ignore if too soon after last switch
    if (timeSinceLastSwitch < 300) {
      console.log('[App] Debouncing new conversation (too fast)');
      return;
    }

    lastSwitchTimeRef.current = now;
    console.log('[App] Creating new conversation');

    // Clear localStorage to force ChatContainer to create new conversation
    if (typeof window !== 'undefined') {
      try {
        const { clearConversation } = await import('@/hooks/useConversationPersistence');
        clearConversation();
        console.log('[App] Cleared localStorage');
      } catch (error) {
        console.error('[App] Failed to clear localStorage:', error);
      }
    }

    // Reset conversation ID and increment key to force remount
    setActiveConversationId(null);
    setChatKey(prev => prev + 1);
    console.log('[App] Forcing ChatContainer remount for new conversation');
  }, []);

  // Loading screen
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading system capabilities...</p>
        </div>
      </div>
    );
  }

  // Error screen
  if (error || !capabilities) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-2">
            Failed to load system capabilities. Please refresh the page.
          </p>
          <p className="text-sm text-gray-500">{error || 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  // Chat content component factory - creates content with optional compact mode
  // isWidgetMode: when true, constrains voice mode within widget boundaries
  const createChatContent = (compactMode: boolean = false, isWidgetMode: boolean = false) => (
    <>
      {mode === 'chat' ? (
        <ChatLayout
          activeConversationId={activeConversationId}
          onConversationSelect={handleConversationSelect}
          onNewConversation={handleNewConversation}
          theme={theme}
          onThemeChange={setTheme}
          compactMode={compactMode}
        >
          <ConversationSyncProvider>
            <ChatContainer
              key={`${activeConversationId || 'new'}-${chatKey}`}
              onVoiceMode={() => setMode('voice')}
              theme={theme}
              capabilities={capabilities}
            />
          </ConversationSyncProvider>
        </ChatLayout>
      ) : (
        <VoiceMode
          onChatMode={() => setMode('chat')}
          theme={theme}
          setTheme={setTheme}
          capabilities={capabilities}
          isWidget={isWidgetMode}
        />
      )}
    </>
  );

  // Standard chat content (for full-screen mode - no widget constraints)
  const chatContent = createChatContent(false, false);

  // Embed mode content (widget constraints but not compact)
  const embedChatContent = createChatContent(false, true);

  // Compact chat content (for floating chatbot mode - compact + widget constraints)
  const compactChatContent = createChatContent(true, true);

  // When both modes are OFF, show full-screen
  const isFullScreenMode = !embedMode && !floatingButton;

  return (
    <>
      {/* Full-screen mode: no wrapper needed */}
      {isFullScreenMode && chatContent}

      {/* Embed mode: show embedded widget with padding (always visible when enabled) */}
      {embedMode && (
        <WidgetWrapper
          embedMode={true}
          floatingMode={false}
          isOpen={true}
          position={floatingButtonPosition}
          width={embedWidth}
          height={embedHeight}
          maxHeight={embedMaxHeight}
        >
          {embedChatContent}
        </WidgetWrapper>
      )}

      {/* Floating button mode: show button + panel that opens on click */}
      {floatingButton && (
        <>
          <FloatingChatButton
            isOpen={isChatOpen}
            onClick={() => setIsChatOpen(!isChatOpen)}
            position={floatingButtonPosition}
          />
          <WidgetWrapper
            embedMode={false}
            floatingMode={true}
            isOpen={isChatOpen}
            position={floatingButtonPosition}
            width={floatingWidth}
            height={floatingHeight}
            maxHeight={floatingMaxHeight}
          >
            {compactChatContent}
          </WidgetWrapper>
        </>
      )}
    </>
  );
}
