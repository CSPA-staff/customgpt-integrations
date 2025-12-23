'use client';

/**
 * MobileDrawer Component
 *
 * Full-width responsive drawer for mobile devices (<768px)
 * Features:
 * - Slide-in animation from left (250ms)
 * - Overlay backdrop (0.5 opacity)
 * - Swipe from left edge to open (optional)
 * - Swipe right or tap backdrop to close
 * - Focus trap when open
 * - Escape key closes drawer
 * - Body scroll lock when open
 * - Restore scroll position on close
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  children,
  className = '',
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const scrollPosition = useRef(0);

  // Swipe gesture to close
  const swipeHandlers = useSwipeGesture({
    onSwipeRight: onClose,
    threshold: 50,
  });

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Focus trap management
  useEffect(() => {
    if (!isOpen) return;

    // Save currently focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Focus first focusable element in drawer
    const focusableElements = drawerRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements && focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Focus trap
    const handleTab = (e: KeyboardEvent) => {
      if (!drawerRef.current) return;

      const focusableContent = drawerRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      const firstFocusable = focusableContent[0];
      const lastFocusable = focusableContent[focusableContent.length - 1];

      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        } else if (!e.shiftKey && document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTab);

    return () => {
      document.removeEventListener('keydown', handleTab);
      // Restore focus when drawer closes
      previousActiveElement.current?.focus();
    };
  }, [isOpen]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      // Save scroll position
      scrollPosition.current = window.scrollY;

      // Lock body scroll
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollPosition.current}px`;
      document.body.style.width = '100%';
    } else {
      // Restore body scroll
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';

      // Restore scroll position
      window.scrollTo(0, scrollPosition.current);
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    };
  }, [isOpen]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === backdropRef.current) {
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  return (
    <div
      ref={backdropRef}
      className="mobile-drawer-backdrop"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={drawerRef}
        className={`mobile-drawer ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label="Conversation history"
        {...swipeHandlers}
      >
        {children}
      </div>
    </div>
  );
};

export default MobileDrawer;
