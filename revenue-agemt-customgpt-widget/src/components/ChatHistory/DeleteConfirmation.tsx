/**
 * DeleteConfirmation Component
 *
 * Toast notification with undo button.
 * 5-second countdown before permanent delete.
 */

'use client';

import { useEffect } from 'react';
import './DeleteConfirmation.css';

interface DeleteConfirmationProps {
  conversationTitle: string;
  timeRemaining: number;
  onUndo: () => void;
}

export default function DeleteConfirmation({
  conversationTitle,
  timeRemaining,
  onUndo,
}: DeleteConfirmationProps) {
  const secondsRemaining = Math.ceil(timeRemaining / 1000);
  const progress = (timeRemaining / 5000) * 100;

  /**
   * Handle keyboard shortcuts
   */
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'z' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onUndo();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onUndo]);

  return (
    <div className="delete-confirmation-toast" role="alert" aria-live="assertive">
      <div className="delete-confirmation-content">
        <div className="delete-confirmation-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
          </svg>
        </div>

        <div className="delete-confirmation-message">
          <p className="delete-confirmation-title">
            <strong>&quot;{conversationTitle}&quot;</strong> deleted
          </p>
          <p className="delete-confirmation-subtitle">
            Permanently deleting in {secondsRemaining}s
          </p>
        </div>

        <button
          className="delete-confirmation-undo-btn"
          onClick={onUndo}
          title="Undo delete (Cmd/Ctrl+Z)"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" />
          </svg>
          <span>Undo</span>
        </button>
      </div>

      <div className="delete-confirmation-progress">
        <div
          className="delete-confirmation-progress-bar"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Time remaining: ${secondsRemaining} seconds`}
        />
      </div>
    </div>
  );
}
