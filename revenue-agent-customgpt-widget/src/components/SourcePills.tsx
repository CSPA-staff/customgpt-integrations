'use client';

import React from 'react';
import './SourcePills.css';

interface Citation {
  id: number;
  url: string;
  title: string;
  description: string | null;
  image?: string | null;
}

interface SourcePillsProps {
  citations: Citation[];
  maxVisible?: number; // Maximum number of pills to show before "more" indicator
}

/**
 * SourcePills - Compact text-based source links displayed as pills
 * Fourth display option for citations - mobile and floating button friendly
 */
export const SourcePills: React.FC<SourcePillsProps> = ({
  citations,
  maxVisible = 5
}) => {
  if (!citations || citations.length === 0) return null;

  const visibleCitations = citations.slice(0, maxVisible);
  const hiddenCount = citations.length - maxVisible;

  // Truncate title to fit in pill
  const truncateTitle = (title: string, maxLength: number = 25) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength).trim() + '...';
  };

  return (
    <div className="source-pills-container">
      <div className="source-pills">
        {visibleCitations.map((citation, index) => (
          <a
            key={citation.id}
            href={citation.url}
            target="_blank"
            rel="noopener noreferrer"
            className="source-pill"
            title={`View product: ${citation.title}\nSource`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              width="14"
              height="14"
              className="source-pill-icon"
              aria-hidden="true"
            >
              <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
            <span className="source-pill-title">
              {truncateTitle(citation.title)}
            </span>
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              width="10"
              height="10"
              className="source-pill-external"
              aria-hidden="true"
            >
              <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
            </svg>
          </a>
        ))}
        {hiddenCount > 0 && (
          <span className="source-pills-more">
            +{hiddenCount} more
          </span>
        )}
      </div>
    </div>
  );
};

export default SourcePills;
