/**
 * RenameDialog Component
 *
 * Inline editing mode for conversation title.
 * Auto-focus, character limit, validation.
 */

'use client';

import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from 'react';
import './RenameDialog.css';

interface RenameDialogProps {
  conversationId: string;
  currentTitle: string;
  onSave: (newTitle: string) => Promise<void>;
  onCancel: () => void;
}

const MAX_TITLE_LENGTH = 100;

export default function RenameDialog({
  conversationId,
  currentTitle,
  onSave,
  onCancel,
}: RenameDialogProps) {
  const [title, setTitle] = useState(currentTitle);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Auto-focus and select all on mount
   */
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  /**
   * Handle form submission
   */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const trimmedTitle = title.trim();

    // Validate
    if (!trimmedTitle) {
      setError('Title cannot be empty');
      return;
    }

    if (trimmedTitle.length > MAX_TITLE_LENGTH) {
      setError(`Title cannot exceed ${MAX_TITLE_LENGTH} characters`);
      return;
    }

    // No change
    if (trimmedTitle === currentTitle) {
      onCancel();
      return;
    }

    // Save
    setIsSaving(true);
    setError(null);

    try {
      await onSave(trimmedTitle);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save title');
      setIsSaving(false);
    }
  }

  /**
   * Handle keyboard shortcuts
   */
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  }

  /**
   * Handle input change
   */
  function handleChange(value: string) {
    setTitle(value);
    setError(null);
  }

  return (
    <div className="rename-dialog">
      <form onSubmit={handleSubmit} className="rename-form">
        <input
          ref={inputRef}
          type="text"
          className={`rename-input ${error ? 'error' : ''}`}
          value={title}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          maxLength={MAX_TITLE_LENGTH}
          aria-label="Conversation title"
          aria-invalid={!!error}
          aria-describedby={error ? 'rename-error' : undefined}
        />

        <div className="rename-actions">
          <button
            type="submit"
            className="rename-save-btn"
            disabled={isSaving || !title.trim()}
            title="Save (Enter)"
          >
            {isSaving ? (
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" className="spinner">
                <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            )}
          </button>

          <button
            type="button"
            className="rename-cancel-btn"
            onClick={onCancel}
            disabled={isSaving}
            title="Cancel (Esc)"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>
      </form>

      {error && (
        <div id="rename-error" className="rename-error" role="alert">
          {error}
        </div>
      )}

      <div className="rename-hint">
        {title.length}/{MAX_TITLE_LENGTH}
      </div>
    </div>
  );
}
