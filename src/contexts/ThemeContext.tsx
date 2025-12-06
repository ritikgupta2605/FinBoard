/**
 * Theme Context
 * 
 * React Context for managing application theme (light/dark mode).
 * Persists theme preference to localStorage and detects system preference.
 * Applies theme class to document root for CSS variable-based theming.
 */

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

/**
 * Available theme options
 */
type Theme = 'light' | 'dark';

/**
 * Theme context interface
 */
interface ThemeContextType {
  theme: Theme; // Current theme
  toggleTheme: () => void; // Toggle between light and dark
  setTheme: (theme: Theme) => void; // Set theme directly
}

// Create theme context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// LocalStorage key for persisting theme preference
const THEME_STORAGE_KEY = 'finboard-theme';

/**
 * Theme provider component
 * Manages theme state and applies theme to document
 * @param children - Child components that need theme access
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  /**
   * Applies theme class to document root element
   * Updates CSS variables and meta theme-color for mobile browsers
   * @param newTheme - Theme to apply ('light' or 'dark')
   */
  const applyTheme = (newTheme: Theme) => {
    if (typeof window === 'undefined') return; // SSR guard
    
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(newTheme);
    
    // Update meta theme-color for mobile browsers (affects status bar color)
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        newTheme === 'dark' ? '#0f172a' : '#ffffff'
      );
    }
  };

  // Load theme from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
      setThemeState(initialTheme);
      applyTheme(initialTheme);
      setMounted(true);
    }
  }, []);

  /**
   * Sets theme and persists to localStorage
   * @param newTheme - Theme to set
   */
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    }
  };

  /**
   * Toggles between light and dark theme
   */
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  // Provide context even before mount to prevent hydration errors
  // The theme will be applied once mounted
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context
 * @returns Theme context with current theme and theme control functions
 * @throws Error if used outside ThemeProvider
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

