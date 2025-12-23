'use client';

import { useState, useEffect } from 'react';

interface AgentSettings {
  chatbot_avatar: string | null;
  chatbot_title: string;
  user_name: string;
  example_questions: string[];
  // Feature toggles
  enable_feedbacks?: boolean;
  enable_citations?: number; // 0 = disabled, 1-5 = number of citations to show
  markdown_enabled?: boolean;
  // UI customization
  chatbot_color?: string;
  chatbot_toolbar_color?: string;
  chatbot_background_color?: string;
  default_prompt?: string;
}

// Default settings to use when API fails or settings are missing
export const DEFAULT_AGENT_SETTINGS: AgentSettings = {
  chatbot_avatar: null,
  chatbot_title: 'AI Assistant',
  user_name: 'You',
  example_questions: [],
  enable_feedbacks: true,
  enable_citations: 3,
  markdown_enabled: true,
};

export const useAgentSettings = () => {
  const [settings, setSettings] = useState<AgentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/agent/settings');

        if (!response.ok) {
          throw new Error('Failed to fetch agent settings');
        }

        const data = await response.json();

        // Check if response contains an error
        if (data.error) {
          throw new Error(data.error);
        }

        setSettings(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching agent settings:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        // Use default settings as fallback when API fails
        setSettings(DEFAULT_AGENT_SETTINGS);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { settings, loading, error };
};
