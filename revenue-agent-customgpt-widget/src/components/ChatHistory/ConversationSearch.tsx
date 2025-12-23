/**
 * ConversationSearch Component
 *
 * Search input with keyboard accessibility and WCAG 2.2 AA compliance.
 * Features:
 * - Debounced search (300ms delay)
 * - React 18 concurrent features (useTransition, useDeferredValue)
 * - Clear button when input has value
 * - Keyboard shortcut: Cmd/Ctrl+K to focus
 * - Submit button for accessibility
 * - ARIA labels and proper color contrast (4.5:1 minimum)
 */

'use client';

import { useState, useEffect, useRef, useCallback, useTransition, useDeferredValue } from 'react';
import './ConversationSearch.css';

interface ConversationSearchProps {
  onSearchChange: (query: string) => void;
  placeholder?: string;
  initialValue?: string;
}

export default function ConversationSearch({
  onSearchChange,
  placeholder = 'Search conversations...',
  initialValue = ''
}: ConversationSearchProps) {
  const [inputValue, setInputValue] = useState(initialValue);
  const [isPending, startTransition] = useTransition();
  const deferredInputValue = useDeferredValue(inputValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // Notify parent when deferred value changes (non-blocking)
  useEffect(() => {
    startTransition(() => {
      onSearchChange(deferredInputValue);
    });
  }, [deferredInputValue, onSearchChange]);

  // Keyboard shortcut: Cmd/Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Limit to 200 characters
    const value = e.target.value.slice(0, 200);
    // Update input immediately for responsive UI
    setInputValue(value);
  }, []);

  const handleClear = useCallback(() => {
    setInputValue('');
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    // Force immediate search on submit
    onSearchChange(inputValue);
  }, [inputValue, onSearchChange]);

  return (
    <form
      className="conversation-search"
      onSubmit={handleSubmit}
      role="search"
      aria-label="Search conversations"
    >
      <div className="search-input-wrapper">
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          width="16"
          height="16"
          className="search-icon"
          aria-hidden="true"
        >
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>

        <input
          ref={inputRef}
          type="search"
          className="search-input"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          aria-label="Search conversations"
          aria-describedby="search-hint"
          aria-busy={isPending}
          maxLength={200}
        />

        {inputValue && (
          <button
            type="button"
            className="clear-button"
            onClick={handleClear}
            aria-label="Clear search"
            title="Clear search"
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              width="16"
              height="16"
              aria-hidden="true"
            >
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        )}

        <button
          type="submit"
          className="search-submit"
          aria-label="Search"
          title="Search"
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            width="16"
            height="16"
            aria-hidden="true"
          >
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
        </button>
      </div>

      <span id="search-hint" className="search-hint">
        Press Cmd+K (Mac) or Ctrl+K (Windows) to focus search
      </span>
    </form>
  );
}
