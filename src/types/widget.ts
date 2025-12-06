/**
 * Widget Type Definitions
 * 
 * This file contains all TypeScript type definitions for widgets,
 * including display modes, field configurations, and dashboard state.
 */

// Display modes for widgets - determines how data is rendered
export type DisplayMode = 'card' | 'table' | 'chart';

export type ChartType = 'line' | 'candlestick';
export type TimeInterval = 'daily' | 'weekly' | 'monthly' | 'custom';

export type FieldFormat = 'none' | 'currency' | 'percentage' | 'number' | 'date' | 'datetime';

/**
 * Configuration for a single field within a widget
 * Defines which data field to display and how to format it
 */
export interface WidgetField {
  path: string; // JSON path to the field in API response (e.g., 'data.price')
  displayName?: string; // Custom display name for the field
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object'; // Data type of the field
  format?: FieldFormat; // How to format the field value
  currencySymbol?: string; // For currency format (e.g., '$', '₹', '€')
  decimalPlaces?: number; // Number of decimal places to show
}

/**
 * Complete configuration for a widget
 * Contains all settings needed to fetch, display, and manage widget data
 */
export interface WidgetConfig {
  id: string; // Unique identifier for the widget
  name: string; // Display name shown in widget header
  description?: string; // Optional description for the widget
  apiUrl: string; // API endpoint URL to fetch data from
  apiKey?: string; // API key for header-based authentication
  apiKeyHeader?: string; // Header name for API key (e.g., 'x-api-key')
  refreshInterval: number; // Auto-refresh interval in seconds (0 = disabled)
  cacheTTL?: number; // Cache time-to-live in seconds (default: 30)
  displayMode: DisplayMode; // How to render the widget (card, table, or chart)
  selectedFields: WidgetField[]; // Fields to display from API response
  chartType?: ChartType; // Type of chart (line or candlestick) - only for chart mode
  timeInterval?: TimeInterval; // For chart time intervals (Daily, Weekly, Monthly)
  layout?: {
    // Grid layout position and size (for react-grid-layout)
    x: number; // Column position
    y: number; // Row position
    w: number; // Width in grid units
    h: number; // Height in grid units
  };
  createdAt: number; // Timestamp when widget was created
  lastUpdated?: number; // Timestamp when widget data was last updated
  detectedCurrency?: {
    // Automatically detected currency from API response
    code: string; // Currency code (e.g., 'USD', 'INR')
    symbol: string; // Currency symbol (e.g., '$', '₹')
    path: string; // Path where currency was found in API response
  };
}

/**
 * Standard API response structure
 * Used by the API fetching utilities
 */
export interface ApiResponse {
  data: any; // The actual data from API
  error?: string; // Error message if request failed
  timestamp: number; // When the data was fetched
}

/**
 * Field mapping structure for JSON field explorer
 * Represents a field in the API response with its path, value, and nested children
 */
export interface FieldMapping {
  path: string; // JSON path to this field
  value: any; // Current value of the field
  type: string; // Type of the field (string, number, object, array, etc.)
  children?: FieldMapping[]; // Nested fields if this is an object or array
}

/**
 * Dashboard state structure
 * Contains all widgets and their layout positions
 */
export interface DashboardState {
  widgets: WidgetConfig[]; // Array of all widget configurations
  layout: Record<string, { x: number; y: number; w: number; h: number }>; // Layout positions keyed by widget ID
}

/**
 * Dashboard export/import configuration
 * Complete snapshot of dashboard state for backup and sharing
 */
export interface DashboardExport {
  version: string;
  exportDate: string;
  widgets: WidgetConfig[];
  layouts?: {
    lg?: Record<string, { x: number; y: number; w: number; h: number }>;
    md?: Record<string, { x: number; y: number; w: number; h: number }>;
    sm?: Record<string, { x: number; y: number; w: number; h: number }>;
    xs?: Record<string, { x: number; y: number; w: number; h: number }>;
    xxs?: Record<string, { x: number; y: number; w: number; h: number }>;
  };
  metadata?: {
    widgetCount: number;
    layoutBreakpoints?: string[];
  };
}