/**
 * Line Chart Widget Component
 * 
 * Displays widget data as a line chart using Recharts.
 * Automatically extracts time-series data from API responses and plots
 * multiple fields as separate lines on the chart.
 */

'use client';

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { WidgetConfig, WidgetField } from '@/types';
import { useWidgetData } from '@/hooks/useWidgetData';
import { getNestedValue } from '@/utils/api';

/**
 * Props for ChartWidget component
 */
interface ChartWidgetProps {
  widget: WidgetConfig; // Widget configuration
}

/**
 * Line chart widget component
 * @param widget - Widget configuration containing fields to plot
 * @returns Line chart JSX with time-series data visualization
 */
export default function ChartWidget({ widget }: ChartWidgetProps) {
  const { data, loading, error, getFieldValue } = useWidgetData(widget);
  
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
        // If no array found, treat the data itself as a single data point
        // This is useful for APIs that return single objects (like quote endpoints)
        // We'll create a single-point chart or show a message
        arrayData = [data];
      }
    }

    // Transform array data for chart
    return arrayData.slice(0, 50).map((item, index) => {
      const chartPoint: Record<string, any> = { index };
      
      widget.selectedFields.forEach((field) => {
        const value = getNestedValue(item, field.path);
        const displayName = field.displayName || field.path.split('.').pop() || field.path;
        
        // Try to convert to number for chart
        const numValue = Number(value);
        chartPoint[displayName] = isNaN(numValue) ? value : numValue;
      });
      
      return chartPoint;
    });
      }, [data, widget.selectedFields]);

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

  if (chartData.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-dark-muted text-sm">No data available for chart</p>
        <p className="text-dark-muted text-xs mt-2">
          Line charts require time-series data (an array). Your API returned a single object.
        </p>
      </div>
    );
  }

  // Check if we only have one data point (single object response)
  const hasOnlyOnePoint = chartData.length === 1;
  
  if (hasOnlyOnePoint) {
    return (
      <div className="text-center py-8">
        <div className="mb-4">
          <p className="text-dark-muted text-sm mb-2">
            Line charts work best with time-series data (multiple data points over time).
          </p>
          <p className="text-dark-muted text-xs mb-4">
            Your API returned a single data point. Here are the current values:
          </p>
          <div className="grid grid-cols-2 gap-2 text-left max-w-md mx-auto">
            {widget.selectedFields.map((field) => {
              const displayName = field.displayName || field.path.split('.').pop() || field.path;
              const value = chartData[0][displayName];
              return (
                <div key={field.path} className="bg-dark-bg p-2 rounded">
                  <div className="text-xs text-dark-muted">{displayName}</div>
                  <div className="text-sm text-dark-text font-semibold">
                    {typeof value === 'number' ? value.toLocaleString() : String(value)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <p className="text-dark-muted text-xs">
          💡 Tip: For line charts, use an endpoint that returns historical data (e.g., /candle endpoint with time range)
        </p>
      </div>
    );
  }

  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  // Format X-axis labels based on time interval
  const formatXAxisLabel = (value: any, index: number): string => {
    // If data has a date/timestamp field, use it
    if (chartData[index] && chartData[index].date) {
      const date = new Date(chartData[index].date);
      if (timeInterval === 'daily') {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (timeInterval === 'weekly') {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (timeInterval === 'monthly') {
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }
    }
    // Fallback to index
    return String(index + 1);
  };

  return (
    <div className="h-64 w-full">
      <div className="mb-2 text-xs text-dark-muted text-center">
        {timeInterval.charAt(0).toUpperCase() + timeInterval.slice(1)} Interval
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis 
            dataKey="index" 
            stroke="#94a3b8" 
            tickFormatter={formatXAxisLabel}
            interval="preserveStartEnd"
          />
          <YAxis stroke="#94a3b8" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '0.5rem',
              color: '#f1f5f9',
            }}
          />
          <Legend
            wrapperStyle={{ color: '#f1f5f9' }}
          />
          {widget.selectedFields.map((field, index) => {
            const displayName = field.displayName || field.path.split('.').pop() || field.path;
            return (
              <Line
                key={field.path}
                type="monotone"
                dataKey={displayName}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
