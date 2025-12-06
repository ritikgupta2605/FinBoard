/**
 * API Proxy Route
 * 
 * Next.js API route that acts as a server-side proxy for API requests.
 * Used to bypass CORS restrictions by making server-to-server requests.
 * Supports header-based API key authentication.
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * GET handler for proxy requests
 * Fetches data from target API and returns it to the client
 * @param request - Next.js request object with query parameters
 * @returns JSON response with data or error
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const targetUrl = searchParams.get('url');
  const apiKey = searchParams.get('apiKey');
  const apiKeyHeader = searchParams.get('apiKeyHeader');

  if (!targetUrl) {
    return NextResponse.json(
      { error: 'Missing URL parameter' },
      { status: 400 }
    );
  }

  try {
    // Build headers for the request
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
    };
    
    // Only add API key to header if BOTH apiKey and apiKeyHeader are provided
    // This prevents adding headers for APIs that use query parameters for auth (like Finnhub)
    if (apiKey && apiKeyHeader && apiKeyHeader.trim() !== '') {
      headers[apiKeyHeader] = apiKey;
    }

    // Fetch from the target API (server-to-server, no CORS issues)
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: headers,
      // Add cache control to avoid caching issues
      cache: 'no-store',
    });

    if (!response.ok) {
      let errorText: string;
      let errorMessage = `HTTP error! status: ${response.status}`;
      
      try {
        errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorData.description || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }

      // Log the error for debugging
      console.error('Proxy error:', {
        status: response.status,
        statusText: response.statusText,
        url: targetUrl,
        errorMessage,
      });

      return NextResponse.json(
        { error: errorMessage, status: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}

