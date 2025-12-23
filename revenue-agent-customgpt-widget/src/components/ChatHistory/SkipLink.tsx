import React from 'react';
import './SkipLink.css';

export interface SkipLinkProps {
  targetId: string;
  children: React.ReactNode;
}

/**
 * Skip link for keyboard navigation accessibility
 * Hidden until focused, allows users to skip to main content
 */
export function SkipLink({ targetId, children }: SkipLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      className="skip-link"
      onClick={handleClick}
    >
      {children}
    </a>
  );
}

export default SkipLink;
