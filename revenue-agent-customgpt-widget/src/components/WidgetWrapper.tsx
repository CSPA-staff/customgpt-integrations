'use client';

import { ReactNode } from 'react';
import './WidgetWrapper.css';

interface WidgetWrapperProps {
  children: ReactNode;
  embedMode: boolean;
  floatingMode: boolean;
  isOpen: boolean;
  position: 'bottom-right' | 'bottom-left';
  width: string;
  height: string;
  maxHeight: string;
}

export default function WidgetWrapper({
  children,
  embedMode,
  floatingMode,
  isOpen,
  position,
  width,
  height,
  maxHeight,
}: WidgetWrapperProps) {
  // Full-screen mode (neither embed nor floating)
  if (!embedMode && !floatingMode) {
    return <>{children}</>;
  }

  // Floating chatbot mode
  if (floatingMode) {
    return (
      <div
        className={`widget-floating-panel ${position} ${isOpen ? 'open' : 'closed'}`}
        data-compact-mode="true"
        style={{
          '--widget-width': width,
          '--widget-height': height,
          '--widget-max-height': maxHeight,
        } as React.CSSProperties}
      >
        {children}
      </div>
    );
  }

  // Embed mode - centered with padding
  return (
    <div className="widget-embed-container">
      <div
        className="widget-embed-panel"
        style={{
          '--widget-width': width,
          '--widget-height': height,
          '--widget-max-height': maxHeight,
        } as React.CSSProperties}
      >
        {children}
      </div>
    </div>
  );
}
