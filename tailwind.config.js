/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        // Theme-aware colors using CSS variables
        'theme-bg': 'var(--color-bg)',
        'theme-card': 'var(--color-card)',
        'theme-border': 'var(--color-border)',
        'theme-text': 'var(--color-text)',
        'theme-muted': 'var(--color-muted)',
        // Legacy dark theme colors (for backward compatibility)
        dark: {
          bg: '#0f172a',
          card: '#1e293b',
          border: '#334155',
          text: '#f1f5f9',
          muted: '#94a3b8',
        },
        // Light theme colors
        light: {
          bg: '#ffffff',
          card: '#f8fafc',
          border: '#e2e8f0',
          text: '#0f172a',
          muted: '#64748b',
        },
        primary: {
          DEFAULT: '#10b981',
          hover: '#059669',
        },
      },
    },
  },
  plugins: [],
}