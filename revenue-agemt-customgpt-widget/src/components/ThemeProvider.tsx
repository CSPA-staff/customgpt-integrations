'use client';

import { useEffect } from 'react';

interface ThemeProviderProps {
  children: React.ReactNode;
  theme?: 'dark' | 'light';
}

export default function ThemeProvider({ children, theme = 'light' }: ThemeProviderProps) {
  useEffect(() => {
    // Apply theme class to body
    // Default is light theme (black on white), dark-theme class for inverted
    const applyTheme = (currentTheme: 'dark' | 'light') => {
      document.body.classList.remove('light-theme', 'dark-theme');
      if (currentTheme === 'dark') {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.add('light-theme');
      }
    };

    applyTheme(theme);

    // Cleanup function
    return () => {
      document.body.classList.remove('light-theme', 'dark-theme');
    };
  }, [theme]);

  return <>{children}</>;
}
