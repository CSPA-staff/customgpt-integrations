'use client';

import './FloatingChatButton.css';

interface FloatingChatButtonProps {
  isOpen: boolean;
  onClick: () => void;
  position: 'bottom-right' | 'bottom-left';
}

// Chat bubble icon (message circle)
const ChatIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

// Close icon (X)
const CloseIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function FloatingChatButton({ isOpen, onClick, position }: FloatingChatButtonProps) {
  return (
    <button
      className={`floating-chat-button ${position} ${isOpen ? 'open' : ''}`}
      onClick={onClick}
      aria-label={isOpen ? 'Close chat' : 'Open chat'}
    >
      <span className="floating-button-icon">
        {isOpen ? <CloseIcon /> : <ChatIcon />}
      </span>
    </button>
  );
}
