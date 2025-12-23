/**
 * Input Sanitization Utilities
 *
 * Provides functions to sanitize user input and prevent XSS attacks.
 * Uses HTML entity encoding for safe text display.
 */

/**
 * HTML entity encoding map
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

/**
 * Sanitize user input by encoding HTML entities
 *
 * @param input - Raw user input string
 * @returns Sanitized string safe for display
 */
export function sanitizeText(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input.replace(/[&<>"'\/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Validate and sanitize conversation title
 *
 * @param title - Raw title input
 * @param maxLength - Maximum allowed length (default: 200)
 * @returns Sanitized and validated title
 */
export function sanitizeConversationTitle(title: string, maxLength: number = 200): string {
  // Handle empty or invalid input
  if (!title || typeof title !== 'string') {
    return 'New Conversation';
  }

  // Trim whitespace
  let sanitized = title.trim();

  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }

  // Remove any control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

  // Encode HTML entities
  sanitized = sanitizeText(sanitized);

  // Return default if result is empty
  return sanitized.length > 0 ? sanitized : 'New Conversation';
}

/**
 * Validate and sanitize preview text
 *
 * @param text - Raw preview text
 * @param maxLength - Maximum allowed length (default: 100)
 * @returns Sanitized preview text
 */
export function sanitizePreviewText(text: string, maxLength: number = 100): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Trim and truncate
  let sanitized = text.trim();
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength) + '...';
  }

  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

  // Encode HTML entities
  return sanitizeText(sanitized);
}

/**
 * Validate session ID format
 *
 * @param sessionId - Session ID to validate
 * @returns True if valid, false otherwise
 */
export function validateSessionId(sessionId: string): boolean {
  if (!sessionId || typeof sessionId !== 'string') {
    return false;
  }

  // Session IDs should be alphanumeric with optional hyphens/underscores
  // Length between 8 and 128 characters
  const regex = /^[a-zA-Z0-9_-]{8,128}$/;
  return regex.test(sessionId);
}

/**
 * Sanitize URL input
 *
 * @param url - Raw URL input
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }
    return parsed.toString();
  } catch {
    return '';
  }
}

/**
 * Validate and sanitize search query
 *
 * @param query - Raw search query
 * @param maxLength - Maximum allowed length (default: 500)
 * @returns Sanitized search query
 */
export function sanitizeSearchQuery(query: string, maxLength: number = 500): string {
  if (!query || typeof query !== 'string') {
    return '';
  }

  // Trim and truncate
  let sanitized = query.trim();
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }

  // Remove control characters but keep spaces
  sanitized = sanitized.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

  return sanitized;
}
