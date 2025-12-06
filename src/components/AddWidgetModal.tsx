'use client';

import { useState, useEffect } from 'react';
import { X, TestTube } from 'lucide-react';
import { WidgetConfig, WidgetField, DisplayMode, FieldMapping, ChartType, TimeInterval } from '@/types';
import { fetchApiData, extractFieldsFromJson } from '@/utils/api';
import { detectCurrency } from '@/utils/currencyDetection';
import JSONFieldSelector from './JSONFieldSelector';

/**
 * Props for AddWidgetModal component
 */
interface AddWidgetModalProps {
  isOpen: boolean; // Whether modal is visible
  onClose: () => void; // Callback to close modal
  onAdd: (widget: Omit<WidgetConfig, 'id' | 'createdAt' | 'lastUpdated'>) => void; // Callback when widget is added
}

/**
 * Modal component for adding new widgets
 * @param props - AddWidgetModalProps
 */
export default function AddWidgetModal({ isOpen, onClose, onAdd }: AddWidgetModalProps) {
  const [widgetName, setWidgetName] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiKeyHeader, setApiKeyHeader] = useState('x-api-key');
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('card');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [timeInterval, setTimeInterval] = useState<TimeInterval>('daily');
  const [selectedFields, setSelectedFields] = useState<WidgetField[]>([]);
  const [showArraysOnly, setShowArraysOnly] = useState(false);
  
  const [fields, setFields] = useState<FieldMapping[]>([]);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [detectedCurrency, setDetectedCurrency] = useState<{ code: string; symbol: string; path: string } | null>(null);


  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setWidgetName('');
      setApiUrl('');
      setApiKey('');
      setApiKeyHeader('x-api-key');
      setRefreshInterval(30);
      setDisplayMode('card');
      setChartType('line');
      setTimeInterval('daily');
      setSelectedFields([]);
      setFields([]);
      setTestResult(null);
      setShowArraysOnly(false);
      setDetectedCurrency(null);
    }
  }, [isOpen]);

  const handleTest = async () => {
    if (!apiUrl.trim()) {
      setTestResult({ success: false, message: 'Please enter an API URL' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // For APIs that use query parameters for auth (like Finnhub with 'token' param),
      // don't extract or add as header. Only use header-based auth if explicitly provided.
      let keyToUse: string | undefined = undefined;
      let headerToUse: string | undefined = undefined;
      
      // Only use header-based auth if both apiKey and apiKeyHeader are explicitly provided
      // Don't extract from URL for APIs that use query params (like Finnhub)
      if (apiKey.trim() && apiKeyHeader.trim()) {
        keyToUse = apiKey.trim();
        headerToUse = apiKeyHeader.trim();
      }
      // If only apiKey is provided but no header, don't use header auth
      // (the API might use query params or the key might already be in the URL)
      
      // Try direct request first (many APIs work fine with browser requests)
      // fetchApiData will automatically fall back to proxy if CORS fails
      const response = await fetchApiData(
        apiUrl,
        keyToUse,
        headerToUse,
        0, // retryCount
        3, // maxRetries
        false // Don't force proxy - try direct first, fallback to proxy on CORS
      );
      
      if (response.error) {
        setTestResult({ success: false, message: response.error });
        setFields([]);
        setDetectedCurrency(null);
      } else {
        const extractedFields = extractFieldsFromJson(response.data, '', showArraysOnly);
        
        // Detect currency from API response
        const currency = detectCurrency(response.data);
        setDetectedCurrency(currency);
        
        let message = `API connection successful! ${extractedFields.length} top-level fields found.`;
        if (currency) {
          message += ` Currency detected: ${currency.code} (${currency.symbol})`;
        }
        
        setTestResult({
          success: true,
          message,
        });
        setFields(extractedFields);
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
      setFields([]);
    } finally {
      setTesting(false);
    }
  };

  // Helper function to extract API key from URL if present
  const extractApiKeyFromUrl = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      const params = new URLSearchParams(urlObj.search);
      // Try common API key parameter names
      return params.get('apikey') || params.get('api_key') || params.get('token') || params.get('key') || null;
    } catch {
      return null;
    }
  };

  const handleAdd = () => {
    if (!widgetName.trim() || !apiUrl.trim()) {
      setTestResult({ success: false, message: 'Please fill in all required fields' });
      return;
    }

    if (selectedFields.length === 0) {
      setTestResult({ success: false, message: 'Please select at least one field to display' });
      return;
    }

    // Only use header-based auth if both apiKey and apiKeyHeader are explicitly provided
    // Don't extract from URL - many APIs (like Finnhub) use query params for auth
    const keyToUse = apiKey.trim() && apiKeyHeader.trim() ? apiKey.trim() : undefined;
    const headerToUse = apiKey.trim() && apiKeyHeader.trim() ? apiKeyHeader.trim() : undefined;

    onAdd({
      name: widgetName,
      apiUrl,
      apiKey: keyToUse || undefined,
      apiKeyHeader: keyToUse ? headerToUse : undefined,
      refreshInterval,
      displayMode,
      chartType: displayMode === 'chart' ? chartType : undefined,
      timeInterval: displayMode === 'chart' ? timeInterval : undefined,
      selectedFields,
      detectedCurrency: detectedCurrency || undefined,
    });

    onClose();
  };

  if (!isOpen) return null;


  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-card rounded-lg border border-dark-border w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-border">
          <h2 className="text-xl font-semibold text-dark-text">Add New Widget</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-bg rounded transition-colors"
          >
            <X className="w-5 h-5 text-dark-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Widget Name */}
          <div>
            <label className="block text-sm font-medium text-dark-text mb-2">
              Widget Name
            </label>
            <input
              type="text"
              value={widgetName}
              onChange={(e) => setWidgetName(e.target.value)}
              placeholder="e.g., Bitcoin Price Tracker"
              className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded text-dark-text placeholder-dark-muted focus:outline-none focus:border-primary"
            />
          </div>

          {/* Description removed */}

          {/* API URL */}
          <div>
            <label className="block text-sm font-medium text-dark-text mb-2">
              API URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="e.g., https://api.example.com/endpoint?param=value"
                className="flex-1 px-4 py-2 bg-dark-bg border border-dark-border rounded text-dark-text placeholder-dark-muted focus:outline-none focus:border-primary"
              />
              <button
                onClick={handleTest}
                disabled={testing || !apiUrl.trim()}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <TestTube className="w-4 h-4" />
                Test
              </button>
            </div>
            {testResult && (
              <p
                className={`mt-2 text-sm ${
                  testResult.success ? 'text-primary' : 'text-red-400'
                }`}
              >
                {testResult.message}
              </p>
            )}
          </div>

          {/* API Key input removed from UI - header-based auth still supported via URL or existing config */}
          <div>
            
          </div>

          {/* Refresh Interval */}
          <div>
            <label className="block text-sm font-medium text-dark-text mb-2">
              Refresh Interval (seconds)
            </label>
            <input
              type="number"
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Math.max(0, parseInt(e.target.value) || 0))}
              min="0"
              className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded text-dark-text focus:outline-none focus:border-primary"
            />
            <p className="mt-1 text-xs text-dark-muted">
              How often to automatically refresh data (0 = disabled)
            </p>
          </div>

          {/* Chart Type Selector (only for chart mode) */}
          {displayMode === 'chart' && (
            <>
              <div>
                <label className="block text-sm font-medium text-dark-text mb-2">
                  Chart Type
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setChartType('line')}
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                      chartType === 'line'
                        ? 'bg-primary text-white'
                        : 'bg-dark-bg text-dark-muted hover:text-dark-text'
                    }`}
                  >
                    Line Chart
                  </button>
                  <button
                    onClick={() => setChartType('candlestick')}
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                      chartType === 'candlestick'
                        ? 'bg-primary text-white'
                        : 'bg-dark-bg text-dark-muted hover:text-dark-text'
                    }`}
                  >
                    Candlestick Chart
                  </button>
                </div>
                {chartType === 'candlestick' && (
                  <p className="mt-2 text-xs text-dark-muted">
                    Note: Candlestick charts require Open, High, Low, and Close fields. Select fields with these names.
                  </p>
                )}
              </div>

              {/* Time Interval Selector */}
              <div>
                <label className="block text-sm font-medium text-dark-text mb-2">
                  Time Interval
                </label>
                <div className="flex gap-2 flex-wrap">
                  {(['daily', 'weekly', 'monthly'] as TimeInterval[]).map((interval) => (
                    <button
                      key={interval}
                      onClick={() => setTimeInterval(interval)}
                      className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                        timeInterval === interval
                          ? 'bg-primary text-white'
                          : 'bg-dark-bg text-dark-muted hover:text-dark-text'
                      }`}
                    >
                      {interval.charAt(0).toUpperCase() + interval.slice(1)}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-dark-muted">
                  Note: The time interval is stored for reference. You may need to adjust your API URL parameters to match the selected interval.
                </p>
              </div>
            </>
          )}

          {/* Field Selector */}
          {fields.length > 0 && (
            <JSONFieldSelector
              fields={fields}
              selectedFields={selectedFields}
              onFieldsChange={setSelectedFields}
              displayMode={displayMode}
              onDisplayModeChange={setDisplayMode}
              showArraysOnly={showArraysOnly}
              onShowArraysOnlyChange={setShowArraysOnly}
              detectedCurrency={detectedCurrency}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-dark-border">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-dark-bg hover:bg-dark-border text-dark-text rounded font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!widgetName.trim() || !apiUrl.trim() || selectedFields.length === 0}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Widget
          </button>
        </div>
      </div>
    </div>
  );
}

