/**
 * Accessibility utilities for WCAG 2.2 AA compliance
 */

/**
 * Announce message to screen readers using ARIA live region
 * Creates a temporary live region that announces the message and removes itself
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement (give screen readers time to read)
  setTimeout(() => {
    if (announcement.parentNode) {
      document.body.removeChild(announcement);
    }
  }, 1000);
}

/**
 * Generate accessible ARIA label for conversation
 */
export function generateAriaLabel(conversation: {
  title?: string;
  timestamp?: string;
  messageCount?: number;
  isActive?: boolean;
}): string {
  const parts: string[] = [];

  if (conversation.title) {
    parts.push(`Conversation: ${conversation.title}`);
  }

  if (conversation.timestamp) {
    parts.push(formatAccessibleDate(conversation.timestamp));
  }

  if (conversation.messageCount !== undefined) {
    const messageText = conversation.messageCount === 1 ? 'message' : 'messages';
    parts.push(`${conversation.messageCount} ${messageText}`);
  }

  if (conversation.isActive) {
    parts.push('Currently active');
  }

  return parts.join(', ');
}

/**
 * Format date/time for screen reader accessibility
 * Converts timestamps to human-readable format
 */
export function formatAccessibleDate(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Less than 1 minute
  if (diffMins < 1) {
    return 'Just now';
  }

  // Less than 1 hour
  if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  }

  // Less than 24 hours
  if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  }

  // Less than 7 days
  if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  }

  // Full date for older items
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  };

  return date.toLocaleDateString('en-US', options);
}

/**
 * Validate color contrast ratio (WCAG AA requires 4.5:1 for normal text, 3:1 for large text)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const luminance1 = getRelativeLuminance(color1);
  const luminance2 = getRelativeLuminance(color2);

  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Calculate relative luminance for color contrast
 */
function getRelativeLuminance(color: string): number {
  // Convert color to RGB
  const rgb = hexToRgb(color);
  if (!rgb) return 0;

  // Convert RGB to relative luminance
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((val) => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Check if contrast ratio meets WCAG AA standards
 */
export function meetsContrastRequirement(
  foreground: string,
  background: string,
  isLargeText = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  const requiredRatio = isLargeText ? 3 : 4.5;
  return ratio >= requiredRatio;
}

/**
 * Generate unique ID for ARIA labels
 */
export function generateAriaId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create describedby relationship between elements
 */
export function linkAriaDescribedBy(
  element: HTMLElement,
  descriptionId: string
): void {
  const existingIds = element.getAttribute('aria-describedby');
  const ids = existingIds ? existingIds.split(' ') : [];

  if (!ids.includes(descriptionId)) {
    ids.push(descriptionId);
    element.setAttribute('aria-describedby', ids.join(' '));
  }
}

/**
 * Create labelledby relationship between elements
 */
export function linkAriaLabelledBy(
  element: HTMLElement,
  labelId: string
): void {
  const existingIds = element.getAttribute('aria-labelledby');
  const ids = existingIds ? existingIds.split(' ') : [];

  if (!ids.includes(labelId)) {
    ids.push(labelId);
    element.setAttribute('aria-labelledby', ids.join(' '));
  }
}

/**
 * Focus element and scroll into view
 */
export function focusElement(
  element: HTMLElement | null,
  options?: ScrollIntoViewOptions
): void {
  if (!element) return;

  element.focus();
  element.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
    ...options,
  });
}

/**
 * Check if element is visible to screen readers
 */
export function isVisibleToScreenReaders(element: HTMLElement): boolean {
  // Check if element has aria-hidden
  if (element.getAttribute('aria-hidden') === 'true') {
    return false;
  }

  // Check if element is visible
  if (element.offsetParent === null) {
    return false;
  }

  return true;
}

/**
 * Get all focusable elements within container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  const elements = Array.from(
    container.querySelectorAll<HTMLElement>(focusableSelectors)
  );

  return elements.filter((el) => isVisibleToScreenReaders(el));
}

/**
 * Check if device prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get keyboard shortcut display based on platform
 */
export function getKeyboardShortcut(
  key: string,
  modifier?: 'cmd' | 'ctrl' | 'shift' | 'alt'
): string {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  let prefix = '';
  if (modifier === 'cmd') {
    prefix = isMac ? '⌘' : 'Ctrl+';
  } else if (modifier === 'ctrl') {
    prefix = 'Ctrl+';
  } else if (modifier === 'shift') {
    prefix = 'Shift+';
  } else if (modifier === 'alt') {
    prefix = isMac ? '⌥' : 'Alt+';
  }

  return `${prefix}${key}`;
}
