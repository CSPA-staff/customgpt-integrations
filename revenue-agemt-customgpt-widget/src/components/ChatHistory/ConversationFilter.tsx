/**
 * ConversationFilter Component
 *
 * Dropdown filter for time-based conversation filtering.
 * Features:
 * - Filter options: All, Today, Last 7 days, Last 30 days
 * - Active filter badge with count
 * - Keyboard accessible (Tab, Enter, Arrow keys)
 * - ARIA labels for screen readers
 * - WCAG 2.2 AA compliant
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { TimePeriod } from '@/utils/conversationHelpers';
import './ConversationFilter.css';

interface FilterOption {
  value: TimePeriod;
  label: string;
  description: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'All', description: 'Show all conversations' },
  { value: 'today', label: 'Today', description: 'Conversations from today' },
  { value: 'week', label: 'Last 7 days', description: 'Conversations from the past week' },
  { value: 'month', label: 'Last 30 days', description: 'Conversations from the past month' },
];

interface ConversationFilterProps {
  selectedPeriod: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
  resultCount?: number;
}

export default function ConversationFilter({
  selectedPeriod,
  onPeriodChange,
  resultCount
}: ConversationFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Set focus to selected option when opening
      const selectedIndex = FILTER_OPTIONS.findIndex(opt => opt.value === selectedPeriod);
      setFocusedIndex(selectedIndex);
    } else {
      setFocusedIndex(-1);
    }
  };

  const handleSelect = (period: TimePeriod) => {
    onPeriodChange(period);
    setIsOpen(false);
    setFocusedIndex(-1);
    buttonRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      // Open dropdown with Enter or Space
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleToggle();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev =>
          prev < FILTER_OPTIONS.length - 1 ? prev + 1 : 0
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev =>
          prev > 0 ? prev - 1 : FILTER_OPTIONS.length - 1
        );
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0) {
          handleSelect(FILTER_OPTIONS[focusedIndex].value);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
        buttonRef.current?.focus();
        break;

      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;

      case 'End':
        e.preventDefault();
        setFocusedIndex(FILTER_OPTIONS.length - 1);
        break;
    }
  };

  const selectedOption = FILTER_OPTIONS.find(opt => opt.value === selectedPeriod);
  const hasActiveFilter = selectedPeriod !== 'all';

  return (
    <div className="conversation-filter" ref={dropdownRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`filter-button ${hasActiveFilter ? 'active' : ''}`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Filter conversations: ${selectedOption?.label}`}
        title="Filter conversations by time period"
      >
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          width="16"
          height="16"
          aria-hidden="true"
        >
          <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
        </svg>

        <span className="filter-label">{selectedOption?.label}</span>

        {hasActiveFilter && resultCount !== undefined && (
          <span className="filter-badge" aria-label={`${resultCount} results`}>
            {resultCount}
          </span>
        )}

        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          width="16"
          height="16"
          className={`dropdown-arrow ${isOpen ? 'open' : ''}`}
          aria-hidden="true"
        >
          <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
        </svg>
      </button>

      {isOpen && (
        <div
          className="filter-dropdown"
          role="listbox"
          aria-label="Filter options"
        >
          {FILTER_OPTIONS.map((option, index) => (
            <button
              key={option.value}
              type="button"
              className={`filter-option ${selectedPeriod === option.value ? 'selected' : ''} ${focusedIndex === index ? 'focused' : ''}`}
              onClick={() => handleSelect(option.value)}
              role="option"
              aria-selected={selectedPeriod === option.value}
              aria-label={option.description}
              tabIndex={-1}
            >
              <span className="option-label">{option.label}</span>

              {selectedPeriod === option.value && (
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="16"
                  height="16"
                  className="check-icon"
                  aria-hidden="true"
                >
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
