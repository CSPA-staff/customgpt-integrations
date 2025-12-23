import { useEffect, useRef, useCallback } from 'react';

export interface FocusTrapOptions {
  enabled?: boolean;
  initialFocus?: HTMLElement | null;
  returnFocusOnDeactivate?: boolean;
  escapeDeactivates?: boolean;
  onDeactivate?: () => void;
}

/**
 * Hook to trap focus within a container (for modals, drawers, etc.)
 * Ensures keyboard navigation stays within the container and returns focus on close
 */
export function useFocusTrap(options: FocusTrapOptions = {}) {
  const {
    enabled = true,
    initialFocus,
    returnFocusOnDeactivate = true,
    escapeDeactivates = true,
    onDeactivate,
  } = options;

  const containerRef = useRef<HTMLElement | null>(null);
  const previousActiveElement = useRef<Element | null>(null);

  /**
   * Get all focusable elements within the container
   */
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];

    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const elements = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(focusableSelectors)
    );

    return elements.filter(
      (el) => el.offsetParent !== null && !el.hasAttribute('aria-hidden')
    );
  }, []);

  /**
   * Handle Tab and Shift+Tab to trap focus
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled || !containerRef.current) return;

      // Handle Escape key
      if (escapeDeactivates && event.key === 'Escape') {
        event.preventDefault();
        onDeactivate?.();
        return;
      }

      // Only trap Tab key
      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Shift + Tab: Moving backwards
      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      }
      // Tab: Moving forwards
      else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    },
    [enabled, escapeDeactivates, onDeactivate, getFocusableElements]
  );

  /**
   * Activate focus trap
   */
  const activate = useCallback(() => {
    if (!enabled || !containerRef.current) return;

    // Store the currently focused element
    previousActiveElement.current = document.activeElement;

    // Focus the initial element or the first focusable element
    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const elementToFocus = initialFocus || focusableElements[0];
    if (elementToFocus) {
      // Use setTimeout to ensure the element is rendered
      setTimeout(() => {
        elementToFocus.focus();
      }, 0);
    }
  }, [enabled, initialFocus, getFocusableElements]);

  /**
   * Deactivate focus trap
   */
  const deactivate = useCallback(() => {
    if (returnFocusOnDeactivate && previousActiveElement.current) {
      (previousActiveElement.current as HTMLElement).focus();
      previousActiveElement.current = null;
    }
  }, [returnFocusOnDeactivate]);

  /**
   * Set up and tear down focus trap
   */
  useEffect(() => {
    if (!enabled) return;

    activate();
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      deactivate();
    };
  }, [enabled, activate, deactivate, handleKeyDown]);

  return {
    containerRef,
    activate,
    deactivate,
  };
}

/**
 * Hook to manage focus return when a component unmounts
 */
export function useFocusReturn(elementToFocus?: HTMLElement | null) {
  const previousActiveElement = useRef<Element | null>(null);

  useEffect(() => {
    // Store current focus
    previousActiveElement.current = document.activeElement;

    // Focus the specified element
    if (elementToFocus) {
      elementToFocus.focus();
    }

    // Return focus on unmount
    return () => {
      if (previousActiveElement.current) {
        (previousActiveElement.current as HTMLElement).focus();
      }
    };
  }, [elementToFocus]);
}

/**
 * Hook to focus the first focusable element when component mounts
 */
export function useAutoFocus(
  containerRef: React.RefObject<HTMLElement>,
  enabled = true
) {
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const firstFocusable = containerRef.current.querySelector<HTMLElement>(
      focusableSelectors
    );

    if (firstFocusable) {
      setTimeout(() => {
        firstFocusable.focus();
      }, 0);
    }
  }, [containerRef, enabled]);
}

/**
 * Hook to focus an element and scroll it into view
 */
export function useFocusAndScroll(
  element: HTMLElement | null,
  options?: ScrollIntoViewOptions
) {
  useEffect(() => {
    if (!element) return;

    element.focus();
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      ...options,
    });
  }, [element, options]);
}
