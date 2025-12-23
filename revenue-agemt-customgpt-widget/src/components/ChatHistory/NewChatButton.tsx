'use client';

import React from 'react';

interface NewChatButtonProps {
  onClick: () => void;
  collapsed?: boolean;
  disabled?: boolean;
}

const NewChatButton: React.FC<NewChatButtonProps> = ({
  onClick,
  collapsed = false,
  disabled = false
}) => {
  return (
    <button
      className={`new-chat-button ${collapsed ? 'collapsed' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label="Start new chat (Cmd+N)"
      title={collapsed ? 'New chat (Cmd+N)' : undefined}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        width="18"
        height="18"
        aria-hidden="true"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
      {!collapsed && (
        <>
          <span>New chat</span>
          <kbd className="keyboard-shortcut">
            <span className="modifier">⌘</span>
            <span>N</span>
          </kbd>
        </>
      )}
    </button>
  );
};

export default NewChatButton;
