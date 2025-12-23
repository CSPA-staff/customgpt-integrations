/**
 * ConversationActions Component
 *
 * Context menu with conversation management actions.
 * Keyboard accessible with ARIA menu pattern.
 */

'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import './ConversationActions.css';

interface ConversationActionsProps {
  conversationId: string;
  conversationTitle: string;
  onRename: () => void;
  onDelete: () => void;
}

export default function ConversationActions({
  conversationId,
  conversationTitle,
  onRename,
  onDelete,
}: ConversationActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const menuItems = [
    { label: 'Rename', action: onRename, icon: '✏️' },
    { label: 'Delete', action: onDelete, icon: '🗑️', danger: true },
  ];

  /**
   * Close menu when clicking outside
   */
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  /**
   * Focus first menu item when opened
   */
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const firstItem = menuRef.current.querySelector('[role="menuitem"]') as HTMLElement;
      firstItem?.focus();
    }
  }, [isOpen]);

  /**
   * Handle keyboard navigation
   */
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        buttonRef.current?.focus();
        break;

      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % menuItems.length);
        break;

      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + menuItems.length) % menuItems.length);
        break;

      case 'Home':
        event.preventDefault();
        setFocusedIndex(0);
        break;

      case 'End':
        event.preventDefault();
        setFocusedIndex(menuItems.length - 1);
        break;

      case 'Enter':
      case ' ':
        event.preventDefault();
        menuItems[focusedIndex].action();
        setIsOpen(false);
        break;
    }
  }

  /**
   * Handle menu item click
   */
  function handleItemClick(action: () => void) {
    action();
    setIsOpen(false);
    buttonRef.current?.focus();
  }

  /**
   * Toggle menu open/close
   */
  function toggleMenu() {
    setIsOpen((prev) => !prev);
    setFocusedIndex(0);
  }

  return (
    <div className="conversation-actions">
      <button
        ref={buttonRef}
        className="conversation-actions-toggle"
        onClick={toggleMenu}
        aria-label={`Actions for ${conversationTitle}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title="More actions"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="conversation-actions-menu"
          role="menu"
          aria-label={`Actions for ${conversationTitle}`}
          onKeyDown={handleKeyDown}
        >
          {menuItems.map((item, index) => (
            <button
              key={item.label}
              className={`conversation-actions-item ${item.danger ? 'danger' : ''} ${
                focusedIndex === index ? 'focused' : ''
              }`}
              role="menuitem"
              tabIndex={focusedIndex === index ? 0 : -1}
              onClick={() => handleItemClick(item.action)}
              onFocus={() => setFocusedIndex(index)}
            >
              <span className="action-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
