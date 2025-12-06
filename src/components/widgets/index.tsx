/**
 * Widget Renderer Component
 * 
 * Router component that renders the appropriate widget type based on
 * the widget's displayMode and chartType configuration.
 * Acts as a factory for different widget display types.
 */

'use client';

import { WidgetConfig } from '@/types';
import CardWidget from './CardWidget';
import TableWidget from './TableWidget';
import ChartWidget from './ChartWidget';
import CandlestickChartWidget from './CandlestickChartWidget';

/**
 * Props for WidgetRenderer component
 */
interface WidgetRendererProps {
  widget: WidgetConfig; // Widget configuration determining which component to render
}

/**
 * Renders the appropriate widget component based on display mode
 * @param widget - Widget configuration
 * @returns The appropriate widget component (Card, Table, Chart, or Candlestick)
 */
export default function WidgetRenderer({ widget }: WidgetRendererProps) {
  switch (widget.displayMode) {
    case 'card':
      return <CardWidget widget={widget} />;
    case 'table':
      return <TableWidget widget={widget} />;
    case 'chart':
      // Check if chart type is candlestick
      if (widget.chartType === 'candlestick') {
        return <CandlestickChartWidget widget={widget} />;
      }
      return <ChartWidget widget={widget} />;
    default:
      return <CardWidget widget={widget} />;
  }
}

export { CardWidget, TableWidget, ChartWidget, CandlestickChartWidget };


