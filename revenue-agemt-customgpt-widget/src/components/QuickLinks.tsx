'use client';

import './QuickLinks.css';

export interface QuickLink {
  id: string;
  label: string;
  icon: 'search' | 'gift' | 'lightbulb' | 'package';
  url: string;
}

interface QuickLinksProps {
  links?: QuickLink[];
  onLinkClick?: (link: QuickLink) => void;
}

// Default quick links - can be overridden via props
const defaultLinks: QuickLink[] = [
  {
    id: 'browse',
    label: 'Browse Products',
    icon: 'search',
    url: '#browse-products',
  },
  {
    id: 'gifts',
    label: 'Gift Ideas',
    icon: 'gift',
    url: '#gift-ideas',
  },
  {
    id: 'recommendations',
    label: 'Recommendations',
    icon: 'lightbulb',
    url: '#recommendations',
  },
  {
    id: 'track',
    label: 'Track Order',
    icon: 'package',
    url: '#track-order',
  },
];

// SVG Icons as components for clean rendering
const icons = {
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  ),
  gift: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 01-2 2H7a2 2 0 01-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 010-5A4.8 8 0 0112 8a4.8 8 0 014.5-5 2.5 2.5 0 010 5" />
    </svg>
  ),
  lightbulb: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 018.91 14" />
    </svg>
  ),
  package: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.5 9.4l-9-5.19" />
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
};

const QuickLinks = ({ links = defaultLinks, onLinkClick }: QuickLinksProps) => {
  const handleClick = (e: React.MouseEvent, link: QuickLink) => {
    // If custom handler provided, use it
    if (onLinkClick) {
      e.preventDefault();
      onLinkClick(link);
      return;
    }

    // Default: allow natural link behavior for real URLs
    // For hash links, just prevent default (placeholder behavior)
    if (link.url.startsWith('#')) {
      e.preventDefault();
      console.log(`Quick link clicked: ${link.label}`);
    }
  };

  return (
    <div className="quick-links">
      <p className="quick-links-label">Quick Links</p>
      <div className="quick-links-grid">
        {links.map((link) => (
          <a
            key={link.id}
            href={link.url}
            className="quick-link"
            onClick={(e) => handleClick(e, link)}
            aria-label={link.label}
          >
            <span className="quick-link-icon">
              {icons[link.icon]}
            </span>
            <span className="quick-link-label">{link.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
};

export default QuickLinks;
