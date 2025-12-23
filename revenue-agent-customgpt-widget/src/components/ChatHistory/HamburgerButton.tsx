'use client';

/**
 * HamburgerButton Component
 *
 * Animated menu toggle button for mobile drawer
 * Features:
 * - Hamburger (☰) transforms to X when open
 * - Smooth animation transition
 * - Accessible with ARIA labels
 * - Keyboard operable
 */

import React from 'react';

interface HamburgerButtonProps {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
}

const HamburgerButton: React.FC<HamburgerButtonProps> = ({
  isOpen,
  onClick,
  className = '',
}) => {
  return (
    <button
      className={`hamburger-button ${isOpen ? 'open' : ''} ${className}`}
      onClick={onClick}
      aria-label={isOpen ? 'Close conversation history' : 'Open conversation history'}
      aria-expanded={isOpen}
      type="button"
    >
      <span className="hamburger-line hamburger-line-top" />
      <span className="hamburger-line hamburger-line-middle" />
      <span className="hamburger-line hamburger-line-bottom" />
    </button>
  );
};

export default HamburgerButton;
