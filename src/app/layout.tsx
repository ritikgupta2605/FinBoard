/**
 * Root Layout Component
 * 
 * Next.js root layout that wraps the entire application.
 * Sets up providers for Redux store and theme context.
 * Configures global styles and metadata.
 */

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import StoreProvider from '@/store/Provider';
import { ThemeProvider } from '@/contexts/ThemeContext';

// Load Inter font from Google Fonts
const inter = Inter({ subsets: ['latin'] });

// Page metadata for SEO and browser display
export const metadata: Metadata = {
  title: 'FinBoard - Finance Dashboard Builder',
  description: 'Connect to APIs and build your custom finance dashboard',
};

/**
 * Root layout component
 * @param children - Child pages/components to render
 * @returns Root layout JSX with providers
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#0f172a" />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <StoreProvider>
            {children}
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}



