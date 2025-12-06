/**
 * Candlestick Chart Widget Component
 * 
 * Displays OHLC (Open, High, Low, Close) financial data as candlestick charts.
 * Uses Recharts ComposedChart with custom bars to render candlestick patterns.
 * Automatically extracts OHLC data from API responses and visualizes price movements.
 */

'use client';

import { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { WidgetConfig } from '@/types';
import { useWidgetData } from '@/hooks/useWidgetData';
import { getNestedValue } from '@/utils/api';

/**
 * Props for CandlestickChartWidget component
 */
interface CandlestickChartWidgetProps {
  widget: WidgetConfig; // Widget configuration
}

/**
 * Data structure for candlestick chart data points
 */
interface CandlestickData {
  name: string; // X-axis label (usually date/time)
  open: number; // Opening price
  high: number; // Highest price
  low: number; // Lowest price
  close: number; // Closing price
  date?: string; // Optional date string
}

/**
 * Candlestick chart widget component for OHLC data
 * @param widget - Widget configuration containing OHLC fields
 * @returns Candlestick chart JSX with price movement visualization
 */
export default function CandlestickChartWidget({ widget }: CandlestickChartWidgetProps) {
  const { data, loading, error } = useWidgetData(widget);
  
  // Get time interval for display purposes
  const timeInterval = widget.timeInterval || 'daily';

  const chartData = useMemo(() => {
    if (!data || widget.selectedFields.length === 0) return [];

    // Try to extract array data
    const firstField = widget.selectedFields[0];
    const fieldValue = getNestedValue(data, firstField.path);
    
    let arrayData: any[] = [];
    
    if (Array.isArray(fieldValue)) {
      arrayData = fieldValue;
    } else if (Array.isArray(data)) {
      arrayData = data;
    } else {
      // Try to find array in nested structure
      const findArray = (obj: any): any[] | null => {
        if (Array.isArray(obj)) return obj;
        if (typeof obj === 'object' && obj !== null) {
          for (const value of Object.values(obj)) {
            const found = findArray(value);
            if (found) return found;
          }
        }
        return null;
      };
      
      const foundArray = findArray(data);
      if (foundArray) {
        arrayData = foundArray;
      } else {
        // Handle Alpha Vantage format: object with date keys containing OHLC data
        // Look for objects that look like time series (keys are dates, values are objects with OHLC)
        const findTimeSeriesObject = (obj: any, depth = 0): any[] | null => {
          if (depth > 3) return null; // Limit recursion depth
          if (typeof obj !== 'object' || obj === null) return null;
          
          // Check if this looks like a time series object (Alpha Vantage format)
          // Keys should be date-like strings, values should be objects
          const entries = Object.entries(obj);
          if (entries.length > 0) {
            const firstEntry = entries[0];
            const key = String(firstEntry[0]);
            const value = firstEntry[1];
            
            // Check if key looks like a date (YYYY-MM-DD format)
            const isDateKey = /^\d{4}-\d{2}-\d{2}/.test(key);
            // Check if value is an object with numeric fields (OHLC data)
            const isOHLCData = typeof value === 'object' && value !== null && 
                              Object.values(value).some(v => typeof v === 'string' && !isNaN(Number(v)));
            
            if (isDateKey && isOHLCData) {
              // Convert object to array, preserving date as a field
              return entries.map(([date, ohlcData]) => ({
                ...(ohlcData as any),
                _date: date, // Store date separately
              }));
            }
          }
          
          // Recursively search nested objects
          for (const value of Object.values(obj)) {
            const found = findTimeSeriesObject(value, depth + 1);
            if (found) return found;
          }
          
          return null;
        };
        
        const timeSeriesData = findTimeSeriesObject(data);
        if (timeSeriesData) {
          arrayData = timeSeriesData;
        }
      }
    }

    // Map fields to OHLC (Open, High, Low, Close)
    const ohlcFields = {
      open: widget.selectedFields.find((f) => 
        f.path.toLowerCase().includes('open') || 
        f.displayName?.toLowerCase().includes('open')
      ),
      high: widget.selectedFields.find((f) => 
        f.path.toLowerCase().includes('high') || 
        f.displayName?.toLowerCase().includes('high')
      ),
      low: widget.selectedFields.find((f) => 
        f.path.toLowerCase().includes('low') || 
        f.displayName?.toLowerCase().includes('low')
      ),
      close: widget.selectedFields.find((f) => 
        f.path.toLowerCase().includes('close') || 
        f.path.toLowerCase().includes('price') ||
        f.displayName?.toLowerCase().includes('close') ||
        f.displayName?.toLowerCase().includes('price')
      ),
      date: widget.selectedFields.find((f) => 
        f.path.toLowerCase().includes('date') || 
        f.path.toLowerCase().includes('time') ||
        f.displayName?.toLowerCase().includes('date')
      ),
    };

    // Transform array data for candlestick chart
    return arrayData.slice(0, 50).map((item, index) => {
      // Try to extract OHLC values using field paths first
      let open = ohlcFields.open ? Number(getNestedValue(item, ohlcFields.open.path)) : NaN;
      let high = ohlcFields.high ? Number(getNestedValue(item, ohlcFields.high.path)) : NaN;
      let low = ohlcFields.low ? Number(getNestedValue(item, ohlcFields.low.path)) : NaN;
      let close = ohlcFields.close ? Number(getNestedValue(item, ohlcFields.close.path)) : NaN;
      
      // If not found via paths, try direct object access (for Alpha Vantage format: "1. open", "2. high", etc.)
      if ((isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) && item && typeof item === 'object') {
        // Try to find fields that contain open/high/low/close (case-insensitive)
        const itemKeys = Object.keys(item);
        
        // Find open field (Alpha Vantage uses "1. open" or just "open")
        if (isNaN(open)) {
          const openKey = itemKeys.find(k => 
            k.toLowerCase().includes('open') && !k.toLowerCase().includes('close')
          );
          if (openKey) open = Number(item[openKey]);
        }
        
        // Find high field
        if (isNaN(high)) {
          const highKey = itemKeys.find(k => k.toLowerCase().includes('high'));
          if (highKey) high = Number(item[highKey]);
        }
        
        // Find low field
        if (isNaN(low)) {
          const lowKey = itemKeys.find(k => k.toLowerCase().includes('low'));
          if (lowKey) low = Number(item[lowKey]);
        }
        
        // Find close field
        if (isNaN(close)) {
          const closeKey = itemKeys.find(k => 
            k.toLowerCase().includes('close') || 
            (k.toLowerCase().includes('price') && !k.toLowerCase().includes('open'))
          );
          if (closeKey) close = Number(item[closeKey]);
        }
      }
      
      // Get date - try _date field first (from Alpha Vantage conversion), then field path, then object keys
      let date: string;
      if (item._date) {
        date = String(item._date);
      } else if (ohlcFields.date) {
        date = String(getNestedValue(item, ohlcFields.date.path) || `Item ${index + 1}`);
      } else {
        // Try to find date in object keys
        const itemKeys = Object.keys(item);
        const dateKey = itemKeys.find(k => 
          k.toLowerCase().includes('date') || 
          k.toLowerCase().includes('time') ||
          /^\d{4}-\d{2}-\d{2}/.test(k) // Date-like key
        );
        date = dateKey ? String(item[dateKey] || dateKey) : `Item ${index + 1}`;
      }

      return {
        name: date,
        open: isNaN(open) ? 0 : open,
        high: isNaN(high) ? 0 : high,
        low: isNaN(low) ? 0 : low,
        close: isNaN(close) ? 0 : close,
        date,
      } as CandlestickData;
    }).filter((item) => item.open > 0 || item.high > 0 || item.low > 0 || item.close > 0);
  }, [data, widget.selectedFields]);

  // Calculate range for wick (high-low)
  const candlestickData = useMemo(() => {
    return chartData.map((item) => ({
      ...item,
      range: item.high - item.low,
      bodyTop: Math.max(item.open, item.close),
      bodyBottom: Math.min(item.open, item.close),
      bodyHeight: Math.abs(item.close - item.open),
      isPositive: item.close >= item.open,
    }));
  }, [chartData]);

  if (loading) {
    return (
      <div className="h-64 bg-dark-bg rounded animate-pulse flex items-center justify-center">
        <p className="text-dark-muted text-sm">Loading chart data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (candlestickData.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-dark-muted text-sm mb-2">No data available for candlestick chart</p>
        <p className="text-dark-muted text-xs">
          {'Candlestick charts require Open, High, Low, and Close fields. Make sure you\'ve selected fields with these names.'}
        </p>
      </div>
    );
  }

  // Custom candlestick cell renderer
  const renderCandlestick = (entry: any, index: number) => {
    const isPositive = entry.isPositive;
    return (
      <Cell key={`cell-${index}`} fill={isPositive ? '#10b981' : '#ef4444'} />
    );
  };

  // Format X-axis labels based on time interval
  const formatXAxisLabel = (value: any, index: number): string => {
    // If data has a date/timestamp field, use it
    if (candlestickData[index] && candlestickData[index].date) {
      const date = new Date(candlestickData[index].date);
      if (timeInterval === 'daily') {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (timeInterval === 'weekly') {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (timeInterval === 'monthly') {
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }
    }
    // Fallback to name or index
    return value || String(index + 1);
  };

  // Custom Tooltip Component
  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    // Get data from payload - try different possible structures
    const data = (payload[0]?.payload || payload[0]?.payload) as any;
    
    if (!data || typeof data.open === 'undefined') {
      return null;
    }

    const formatCurrency = (value: number) => {
      if (isNaN(value) || value === null || value === undefined) return '$0.00';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    };

    const open = Number(data.open) || 0;
    const high = Number(data.high) || 0;
    const low = Number(data.low) || 0;
    const close = Number(data.close) || 0;
    const isPositive = close >= open;

    return (
      <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-3 shadow-lg min-w-[220px] z-50">
        <p className="text-sm font-semibold text-[#f1f5f9] mb-3 border-b border-[#334155] pb-2">
          {data.date || data.name || label || 'Date'}
        </p>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0"></div>
              <span className="text-xs text-[#94a3b8]">Open:</span>
            </div>
            <span className="text-sm font-medium text-[#f1f5f9]">
              {formatCurrency(open)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0"></div>
              <span className="text-xs text-[#94a3b8]">High:</span>
            </div>
            <span className="text-sm font-medium text-green-400">
              {formatCurrency(high)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0"></div>
              <span className="text-xs text-[#94a3b8]">Low:</span>
            </div>
            <span className="text-sm font-medium text-red-400">
              {formatCurrency(low)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isPositive ? 'bg-[#10b981]' : 'bg-red-500'}`}></div>
              <span className="text-xs text-[#94a3b8]">Close:</span>
            </div>
            <span className={`text-sm font-medium ${isPositive ? 'text-[#10b981]' : 'text-red-400'}`}>
              {formatCurrency(close)}
            </span>
          </div>
          {open > 0 && (
            <div className="mt-2 pt-2 border-t border-[#334155]">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-[#94a3b8]">Change:</span>
                <span className={`text-xs font-medium ${isPositive ? 'text-[#10b981]' : 'text-red-400'}`}>
                  {isPositive ? '+' : ''}
                  {formatCurrency(close - open)} (
                  {((close - open) / open * 100).toFixed(2)}%)
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-64 w-full">
      <div className="mb-2 text-xs text-dark-muted text-center">
        {timeInterval.charAt(0).toUpperCase() + timeInterval.slice(1)} Interval - Candlestick
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={candlestickData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis 
            dataKey="name" 
            stroke="#94a3b8"
            angle={-45}
            textAnchor="end"
            height={60}
            interval="preserveStartEnd"
            tickFormatter={formatXAxisLabel}
          />
          <YAxis stroke="#94a3b8" />
          <Tooltip content={<CustomTooltip />} />
          {/* High-Low range bar (represents the wick) */}
          <Bar 
            dataKey="range" 
            fill="transparent"
            stroke="#94a3b8"
            strokeWidth={1}
          />
          {/* Body (open-close difference) */}
          <Bar 
            dataKey="bodyHeight" 
            fill="#10b981"
          >
            {candlestickData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.isPositive ? '#10b981' : '#ef4444'} 
              />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center justify-center gap-4 text-xs text-dark-muted">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-primary rounded"></div>
          <span>Bullish (Close ≥ Open)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span>Bearish (Close &lt; Open)</span>
        </div>
      </div>
    </div>
  );
}
