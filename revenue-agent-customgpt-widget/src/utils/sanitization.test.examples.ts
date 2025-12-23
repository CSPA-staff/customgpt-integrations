/**
 * Sanitization Utilities - Usage Examples
 *
 * This file demonstrates proper usage of sanitization utilities.
 * Copy these patterns when handling user input.
 */

import {
  sanitizeText,
  sanitizeConversationTitle,
  sanitizePreviewText,
  validateSessionId,
  sanitizeUrl,
  sanitizeSearchQuery,
} from './sanitization';

// ============================================================================
// 1. BASIC TEXT SANITIZATION
// ============================================================================

// Example 1: Sanitize user-generated content
const userInput = '<script>alert("XSS")</script>Hello World';
const safe = sanitizeText(userInput);
// Result: "&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;Hello World"

// Example 2: Sanitize before displaying in UI
const displayText = (text: string) => {
  return sanitizeText(text);
};

// ============================================================================
// 2. CONVERSATION TITLE SANITIZATION
// ============================================================================

// Example 3: Create conversation from user message
const createConversation = (userMessage: string, messages: any[]) => {
  // Raw title from message
  const rawTitle = userMessage.slice(0, 50) + (userMessage.length > 50 ? '...' : '');

  // Sanitize title (max 200 chars, HTML encoded)
  const title = sanitizeConversationTitle(rawTitle);

  return {
    title,
    messages,
    createdAt: Date.now(),
  };
};

// Example 4: Rename conversation with validation
const renameConversation = (sessionId: string, newTitle: string) => {
  // Validate session ID format
  if (!validateSessionId(sessionId)) {
    throw new Error('Invalid session ID format');
  }

  // Sanitize new title
  const sanitizedTitle = sanitizeConversationTitle(newTitle, 200);

  // Update conversation...
  return { sessionId, title: sanitizedTitle };
};

// ============================================================================
// 3. PREVIEW TEXT SANITIZATION
// ============================================================================

// Example 5: Generate preview from AI response
const generatePreview = (aiResponse: string) => {
  // Sanitize and truncate to 100 chars
  const preview = sanitizePreviewText(aiResponse, 100);
  return preview;
};

// Example 6: Display conversation preview
const ConversationPreview = ({ text }: { text: string }) => {
  const safePreview = sanitizePreviewText(text);
  return <p>{safePreview}</p>;
};

// ============================================================================
// 4. SESSION ID VALIDATION
// ============================================================================

// Example 7: Validate before database operation
const loadSession = async (sessionId: string) => {
  // Validate format (8-128 chars, alphanumeric with -_)
  if (!validateSessionId(sessionId)) {
    throw new Error('Invalid session ID');
  }

  // Safe to proceed with database operation
  // const session = await db.get(sessionId);
};

// Example 8: Generate and validate new session ID
const createSession = () => {
  const sessionId = crypto.randomUUID();

  if (!validateSessionId(sessionId)) {
    throw new Error('Generated invalid session ID');
  }

  return sessionId;
};

// ============================================================================
// 5. URL SANITIZATION
// ============================================================================

// Example 9: Validate external links
const validateExternalUrl = (url: string): string | null => {
  const sanitized = sanitizeUrl(url);

  if (!sanitized) {
    console.warn('Invalid or unsafe URL:', url);
    return null;
  }

  return sanitized;
};

// Example 10: Sanitize citation URLs
const processCitation = (citation: { url: string; title: string }) => {
  const safeUrl = sanitizeUrl(citation.url);
  const safeTitle = sanitizeText(citation.title);

  if (!safeUrl) {
    throw new Error('Invalid citation URL');
  }

  return { url: safeUrl, title: safeTitle };
};

// ============================================================================
// 6. SEARCH QUERY SANITIZATION
// ============================================================================

// Example 11: Sanitize search input
const performSearch = async (query: string) => {
  // Sanitize query (max 500 chars, remove control chars)
  const sanitizedQuery = sanitizeSearchQuery(query, 500);

  if (!sanitizedQuery) {
    return []; // Return empty results for invalid queries
  }

  // Safe to search
  // const results = await searchConversations(sanitizedQuery);
  return [];
};

// Example 12: Handle search form submission
const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const rawQuery = formData.get('query') as string;

  // Sanitize before search
  const query = sanitizeSearchQuery(rawQuery);

  if (!query) {
    console.warn('Invalid search query');
    return;
  }

  // Proceed with search...
};

// ============================================================================
// 7. COMBINED PATTERNS
// ============================================================================

// Example 13: Complete conversation creation workflow
const createCompleteConversation = (
  sessionId: string,
  userMessage: string,
  aiResponse: string
) => {
  // Validate session ID
  if (!validateSessionId(sessionId)) {
    throw new Error('Invalid session ID');
  }

  // Sanitize all text fields
  const title = sanitizeConversationTitle(userMessage);
  const preview = sanitizePreviewText(aiResponse);
  const safeUserMessage = sanitizeText(userMessage);
  const safeAiResponse = sanitizeText(aiResponse);

  return {
    sessionId,
    title,
    preview,
    messages: [
      { role: 'user', content: safeUserMessage },
      { role: 'assistant', content: safeAiResponse },
    ],
  };
};

// Example 14: Update conversation with validation
const updateConversation = (
  sessionId: string,
  updates: {
    title?: string;
    previewText?: string;
    citationUrl?: string;
  }
) => {
  // Validate session ID
  if (!validateSessionId(sessionId)) {
    throw new Error('Invalid session ID');
  }

  // Sanitize all updates
  const sanitized: any = {};

  if (updates.title) {
    sanitized.title = sanitizeConversationTitle(updates.title);
  }

  if (updates.previewText) {
    sanitized.previewText = sanitizePreviewText(updates.previewText);
  }

  if (updates.citationUrl) {
    sanitized.citationUrl = sanitizeUrl(updates.citationUrl);
    if (!sanitized.citationUrl) {
      throw new Error('Invalid citation URL');
    }
  }

  return sanitized;
};

// ============================================================================
// 8. ERROR HANDLING PATTERNS
// ============================================================================

// Example 15: Graceful degradation
const safeCreateTitle = (userInput: string): string => {
  try {
    const title = sanitizeConversationTitle(userInput);
    return title;
  } catch (error) {
    console.error('Failed to create title:', error);
    return 'New Conversation'; // Fallback to default
  }
};

// Example 16: Validation with user feedback
const validateAndNotify = (
  sessionId: string,
  onError: (message: string) => void
): boolean => {
  if (!validateSessionId(sessionId)) {
    onError('Invalid session ID format. Please try again.');
    return false;
  }
  return true;
};

// ============================================================================
// 9. REACT COMPONENT PATTERNS
// ============================================================================

// Example 17: Form input with sanitization
const ConversationTitleInput = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const sanitized = sanitizeConversationTitle(rawValue);
    onChange(sanitized);
  };

  return <input type="text" value={value} onChange={handleChange} maxLength={200} />;
};

// Example 18: Display user-generated content safely
const MessageContent = ({ content }: { content: string }) => {
  // Sanitize before rendering
  const safeContent = sanitizeText(content);

  return (
    <div
      dangerouslySetInnerHTML={{ __html: safeContent }}
      // Note: Even with sanitization, prefer textContent when possible
    />
  );
};

// Better approach - use textContent
const SafeMessageContent = ({ content }: { content: string }) => {
  const safeContent = sanitizeText(content);
  return <div>{safeContent}</div>;
};

// ============================================================================
// 10. TESTING PATTERNS
// ============================================================================

// Example 19: XSS test cases
const xssTestCases = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror=alert("XSS")>',
  'javascript:alert("XSS")',
  '<iframe src="javascript:alert(\'XSS\')"></iframe>',
  '"><script>alert(String.fromCharCode(88,83,83))</script>',
];

const testSanitization = () => {
  xssTestCases.forEach((payload) => {
    const sanitized = sanitizeText(payload);
    console.assert(
      !sanitized.includes('<script>'),
      'Script tags should be encoded'
    );
    console.assert(
      !sanitized.includes('javascript:'),
      'JavaScript protocol should be encoded'
    );
  });
};

// Example 20: Validation test cases
const validationTestCases = {
  validSessionIds: [
    'abc12345',
    'session-id-123',
    'user_session_456',
    'a'.repeat(128), // Max length
  ],
  invalidSessionIds: [
    '', // Empty
    'abc', // Too short
    'a'.repeat(129), // Too long
    'session id', // Spaces
    'session@id', // Invalid chars
    '<script>', // XSS attempt
  ],
};

const testSessionIdValidation = () => {
  validationTestCases.validSessionIds.forEach((id) => {
    console.assert(validateSessionId(id), `Should validate: ${id}`);
  });

  validationTestCases.invalidSessionIds.forEach((id) => {
    console.assert(!validateSessionId(id), `Should reject: ${id}`);
  });
};

// ============================================================================
// SECURITY BEST PRACTICES
// ============================================================================

/**
 * 1. ALWAYS sanitize user input before:
 *    - Storing in database
 *    - Displaying in UI
 *    - Using in URLs
 *    - Passing to APIs
 *
 * 2. VALIDATE session IDs and other identifiers BEFORE database operations
 *
 * 3. ENFORCE length limits to prevent DoS attacks
 *
 * 4. USE proper React patterns:
 *    - Prefer {content} over dangerouslySetInnerHTML
 *    - Sanitize even when using dangerouslySetInnerHTML
 *
 * 5. HANDLE errors gracefully:
 *    - Provide fallback values
 *    - Log sanitization failures
 *    - Notify users of invalid input
 *
 * 6. TEST with malicious payloads:
 *    - XSS attempts
 *    - SQL injection patterns
 *    - Overly long inputs
 *    - Control characters
 *
 * 7. LAYER security:
 *    - Sanitize on input
 *    - Validate on storage
 *    - Encode on output
 */

export {
  // Export examples for testing
  createConversation,
  renameConversation,
  generatePreview,
  validateExternalUrl,
  performSearch,
  createCompleteConversation,
  testSanitization,
  testSessionIdValidation,
};
