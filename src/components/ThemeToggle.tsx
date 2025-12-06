/**
 * Theme Toggle Component
 * 
 * Button component that allows users to switch between light and dark themes.
 * Displays sun icon in dark mode and moon icon in light mode.
 */

'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Theme toggle button component
 * @returns Button that toggles between light and dark themes
 */
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-theme-card border border-theme-border hover:bg-theme-bg transition-colors"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 text-theme-text" />
      ) : (
        <Moon className="w-5 h-5 text-theme-text" />
      )}
    </button>
  );
}

