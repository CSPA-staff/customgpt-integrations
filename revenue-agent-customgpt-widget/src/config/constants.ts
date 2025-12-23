/**
 * Centralized Configuration Constants
 * All configurable values from environment variables with sensible defaults
 */

// ============================================
// Helper Functions
// ============================================

/**
 * Parse boolean from environment variable
 */
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}

/**
 * Parse number from environment variable
 */
function parseNumber(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse float from environment variable
 */
function parseFloat(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = Number.parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

// ============================================
// CustomGPT Configuration
// ============================================

export const CUSTOMGPT_CONFIG = {
  projectId: process.env.CUSTOMGPT_PROJECT_ID || '',
  apiKey: process.env.CUSTOMGPT_API_KEY || '',
  apiBaseUrl: process.env.CUSTOMGPT_API_BASE_URL || 'https://app.customgpt.ai/api/v1',
  stream: parseBoolean(process.env.CUSTOMGPT_STREAM, true),
  useCustomGPT: parseBoolean(process.env.USE_CUSTOMGPT, true),
} as const;

// ============================================
// OpenAI Configuration
// ============================================

export const OPENAI_CONFIG = {
  apiKey: process.env.OPENAI_API_KEY || '',
  completionModel: process.env.AI_COMPLETION_MODEL || 'gpt-4o-mini',
  sttModel: process.env.STT_MODEL || 'gpt-4o-mini-transcribe',
  ttsModel: process.env.OPENAI_TTS_MODEL || 'tts-1',
  ttsVoice: process.env.OPENAI_TTS_VOICE || 'nova',
} as const;

// ============================================
// AI Model Configuration
// ============================================

export const AI_CONFIG = {
  voiceMaxTokens: parseNumber(process.env.AI_VOICE_MAX_TOKENS, 150),
  vadPositiveSpeechThreshold: parseFloat(process.env.VAD_POSITIVE_SPEECH_THRESHOLD, 0.90),
  vadNegativeSpeechThreshold: parseFloat(process.env.VAD_NEGATIVE_SPEECH_THRESHOLD, 0.75),
  // API timeout configuration
  apiTimeoutMs: parseNumber(process.env.CUSTOMGPT_API_TIMEOUT_MS, 30000),
  // Pagination timeout (per page)
  paginationTimeoutMs: parseNumber(process.env.CUSTOMGPT_PAGINATION_TIMEOUT_MS, 15000),
} as const;

// ============================================
// TTS Provider Configuration
// ============================================

export const TTS_CONFIG = {
  provider: (process.env.TTS_PROVIDER || 'OPENAI').toUpperCase() as 'OPENAI' | 'gTTS' | 'ELEVENLABS' | 'STREAMELEMENTS' | 'EDGETTS',
  timeoutMs: parseNumber(process.env.TTS_TIMEOUT_MS, 15000),
  retryAttempts: parseNumber(process.env.TTS_RETRY_ATTEMPTS, 3),
  retryDelayMs: parseNumber(process.env.TTS_RETRY_DELAY_MS, 1000),

  // Provider-specific settings
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY || '',
    voiceId: process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL',
  },
  edgeTTS: {
    voiceName: process.env.EDGETTS_VOICE_NAME || 'en-US-EricNeural',
  },
  streamElements: {
    voice: process.env.STREAMELEMENTS_VOICE || 'Salli',
  },
  googleTTS: {
    host: process.env.GTTS_HOST || 'translate.google.com',
  },
} as const;

// ============================================
// Language Configuration
// ============================================

export const LANGUAGE_CONFIG = {
  default: process.env.LANGUAGE || 'en',
} as const;

// ============================================
// UI/UX Configuration (Client-Side)
// ============================================

export const UI_CONFIG = {
  wordAnimationDelayMs: parseNumber(process.env.NEXT_PUBLIC_WORD_ANIMATION_DELAY_MS, 30),
  messageTruncateLength: parseNumber(process.env.NEXT_PUBLIC_MESSAGE_TRUNCATE_LENGTH, 300),
  toastTimeoutMs: parseNumber(process.env.NEXT_PUBLIC_TOAST_TIMEOUT_MS, 2000),
  textareaMaxHeight: parseNumber(process.env.NEXT_PUBLIC_TEXTAREA_MAX_HEIGHT, 200),
} as const;

// ============================================
// Gamification Configuration (Client-Side)
// ============================================

export const GAMIFICATION_CONFIG = {
  enabled: parseBoolean(process.env.NEXT_PUBLIC_GAMIFICATION_ENABLED, true),
} as const;

// ============================================
// Product Display Configuration (Client-Side)
// ============================================

export const PRODUCT_CONFIG = {
  // Enable/disable the product comparison table feature
  enableComparisonTable: parseBoolean(process.env.NEXT_PUBLIC_ENABLE_COMPARISON_TABLE, true),
} as const;

// ============================================
// Widget Display Mode Configuration (Client-Side)
// ============================================

export const WIDGET_CONFIG = {
  // Embed mode: Show widget with padding like it's embedded in a website
  embedMode: parseBoolean(process.env.NEXT_PUBLIC_WIDGET_EMBED_MODE, false),
  // Floating button mode: Show a floating chat button that opens the chat
  floatingButton: parseBoolean(process.env.NEXT_PUBLIC_WIDGET_FLOATING_BUTTON, false),
  // Floating button position
  floatingButtonPosition: (process.env.NEXT_PUBLIC_WIDGET_FLOATING_POSITION || 'bottom-right') as 'bottom-right' | 'bottom-left',

  // Embed mode dimensions
  embedWidth: process.env.NEXT_PUBLIC_WIDGET_EMBED_WIDTH || '800px',
  embedHeight: process.env.NEXT_PUBLIC_WIDGET_EMBED_HEIGHT || '600px',
  embedMaxHeight: process.env.NEXT_PUBLIC_WIDGET_EMBED_MAX_HEIGHT || '80vh',

  // Floating chatbot dimensions (typical chatbot: narrow and tall)
  floatingWidth: process.env.NEXT_PUBLIC_WIDGET_FLOATING_WIDTH || '380px',
  floatingHeight: process.env.NEXT_PUBLIC_WIDGET_FLOATING_HEIGHT || '550px',
  floatingMaxHeight: process.env.NEXT_PUBLIC_WIDGET_FLOATING_MAX_HEIGHT || '85vh',
} as const;

// ============================================
// Validation Helpers
// ============================================

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  valid: boolean;
  warnings: string[];
  features: {
    customgpt: boolean;
    voice: boolean;
    tts: boolean;
  };
}

/**
 * Validate configuration and return warnings
 * Does NOT throw - returns validation result with warnings
 */
export function validateConfig(): ConfigValidationResult {
  const warnings: string[] = [];
  const features = {
    customgpt: true,
    voice: true,
    tts: true,
  };

  // Check OpenAI API key (required for STT/TTS)
  if (!OPENAI_CONFIG.apiKey) {
    warnings.push('OPENAI_API_KEY is not set - voice features will be disabled');
    features.voice = false;
    features.tts = false;
  }

  // Check CustomGPT credentials
  if (!CUSTOMGPT_CONFIG.projectId) {
    warnings.push('CUSTOMGPT_PROJECT_ID is not set - CustomGPT features will be disabled');
    features.customgpt = false;
  }
  if (!CUSTOMGPT_CONFIG.apiKey) {
    warnings.push('CUSTOMGPT_API_KEY is not set - CustomGPT features will be disabled');
    features.customgpt = false;
  }

  // Check provider-specific TTS credentials
  if (TTS_CONFIG.provider === 'ELEVENLABS' && !TTS_CONFIG.elevenlabs.apiKey) {
    warnings.push('ELEVENLABS_API_KEY is not set - ElevenLabs TTS will fall back to OpenAI');
  }

  // Log warnings in development
  if (warnings.length > 0 && typeof window === 'undefined') {
    console.warn('[Config] Configuration warnings:');
    warnings.forEach(w => console.warn(`  - ${w}`));
  }

  return {
    valid: warnings.length === 0,
    warnings,
    features,
  };
}

/**
 * Check if CustomGPT is configured
 */
export function isCustomGPTConfigured(): boolean {
  return !!(CUSTOMGPT_CONFIG.projectId && CUSTOMGPT_CONFIG.apiKey);
}

/**
 * Check if voice features are configured
 */
export function isVoiceConfigured(): boolean {
  return !!OPENAI_CONFIG.apiKey;
}

/**
 * Get configuration summary for debugging
 */
export function getConfigSummary(): Record<string, unknown> {
  return {
    customgpt: {
      enabled: CUSTOMGPT_CONFIG.useCustomGPT,
      streaming: CUSTOMGPT_CONFIG.stream,
      hasCredentials: !!(CUSTOMGPT_CONFIG.projectId && CUSTOMGPT_CONFIG.apiKey),
    },
    openai: {
      hasApiKey: !!OPENAI_CONFIG.apiKey,
      completionModel: OPENAI_CONFIG.completionModel,
      sttModel: OPENAI_CONFIG.sttModel,
      ttsModel: OPENAI_CONFIG.ttsModel,
      ttsVoice: OPENAI_CONFIG.ttsVoice,
    },
    tts: {
      provider: TTS_CONFIG.provider,
      timeout: TTS_CONFIG.timeoutMs,
      retries: TTS_CONFIG.retryAttempts,
    },
    language: LANGUAGE_CONFIG.default,
  };
}
