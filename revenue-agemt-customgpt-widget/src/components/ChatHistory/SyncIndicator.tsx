'use client';

/**
 * SyncIndicator Component
 *
 * Displays sync status for cross-tab conversation synchronization.
 *
 * Features:
 * - Real-time sync status indicator
 * - Animated sync icon
 * - Last sync timestamp
 * - Compact and unobtrusive design
 * - Auto-hide when idle
 */

import { useState, useEffect } from 'react';
import './SyncIndicator.css';

export interface SyncIndicatorProps {
  /**
   * Whether sync is currently in progress
   */
  isSyncing: boolean;

  /**
   * Timestamp of last successful sync (in milliseconds)
   * null if never synced
   */
  lastSyncTime: number | null;

  /**
   * Auto-hide delay in milliseconds (default: 3000)
   * Set to 0 to disable auto-hide
   */
  autoHideDelay?: number;

  /**
   * CSS class name for styling
   */
  className?: string;
}

/**
 * Format timestamp to relative time string
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);

  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;

  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Sync status indicator component
 */
export function SyncIndicator({
  isSyncing,
  lastSyncTime,
  autoHideDelay = 3000,
  className = '',
}: SyncIndicatorProps) {
  const [visible, setVisible] = useState(false);
  const [relativeTime, setRelativeTime] = useState<string | null>(null);

  // Show indicator when syncing or recently synced
  useEffect(() => {
    if (isSyncing) {
      setVisible(true);
      return;
    }

    if (lastSyncTime && autoHideDelay > 0) {
      setVisible(true);

      // Auto-hide after delay
      const timer = setTimeout(() => {
        setVisible(false);
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [isSyncing, lastSyncTime, autoHideDelay]);

  // Update relative time every second
  useEffect(() => {
    if (!lastSyncTime) {
      setRelativeTime(null);
      return;
    }

    // Update immediately
    setRelativeTime(formatRelativeTime(lastSyncTime));

    // Update every second
    const interval = setInterval(() => {
      setRelativeTime(formatRelativeTime(lastSyncTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [lastSyncTime]);

  // Don't render if not visible
  if (!visible) {
    return null;
  }

  return (
    <div className={`sync-indicator ${className}`} role="status" aria-live="polite">
      <div className="sync-indicator-content">
        {isSyncing ? (
          <>
            <svg
              className="sync-icon syncing"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="14"
              height="14"
              aria-hidden="true"
            >
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            <span className="sync-text">Syncing...</span>
          </>
        ) : (
          <>
            <svg
              className="sync-icon synced"
              viewBox="0 0 24 24"
              fill="currentColor"
              width="14"
              height="14"
              aria-hidden="true"
            >
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
            {relativeTime && (
              <span className="sync-text" title={lastSyncTime ? new Date(lastSyncTime).toLocaleString() : ''}>
                Synced {relativeTime}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
