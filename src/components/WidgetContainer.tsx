'use client';

import { ReactNode } from 'react';
import { Trash2, Settings, RefreshCw } from 'lucide-react';
import { WidgetConfig } from '@/types';
import { formatTime } from '@/utils/helpers';

/**
 * Props for WidgetContainer component
 */
interface WidgetContainerProps {
  widget: WidgetConfig;
  onRemove: (id: string) => void;
  onRefresh: () => void | Promise<void>;
  onSettings?: (id: string) => void;
  children: ReactNode;
  loading?: boolean;
  lastUpdated?: number;
  fromCache?: boolean;
  cacheAge?: number | null;
}

/**
 * Widget container component that wraps widget content
 * @param props - WidgetContainerProps containing widget config and callbacks
 */
export default function WidgetContainer({
  widget,
  onRemove,
  onRefresh,
  onSettings,
  children,
  loading,
  lastUpdated,
  fromCache,
  cacheAge,
}: WidgetContainerProps) {

  /**
   * Handles widget removal
   * Prevents event propagation to avoid triggering drag operations
   */
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onRemove(widget.id);
  };

  /**
   * Handles manual widget refresh
   * Prevents event propagation to avoid triggering drag operations
   */
  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRefresh();
  };

  return (
    <div className="bg-dark-card rounded-lg border border-dark-border p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 drag-handle cursor-move flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-dark-text font-semibold text-lg truncate">{widget.name}</h3>
              {/* Display detected currency badge if currency was auto-detected from API */}
              {widget.detectedCurrency && (
                <span 
                  className="text-xs font-medium bg-primary/20 text-primary px-2 py-0.5 rounded flex-shrink-0"
                  title={`Currency detected: ${widget.detectedCurrency.code} (${widget.detectedCurrency.symbol})`}
                >
                  {widget.detectedCurrency.symbol} {widget.detectedCurrency.code}
                </span>
              )}
            </div>
            {widget.description && (
              <p className="text-xs text-dark-muted mt-0.5 line-clamp-1" title={widget.description}>
                {widget.description}
              </p>
            )}
          </div>
          <span className="text-xs text-dark-muted bg-dark-bg px-2 py-1 rounded flex-shrink-0">
            {widget.refreshInterval}s
          </span>
        </div>
        <div className="flex items-center gap-2" style={{ zIndex: 10 }}>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-1.5 hover:bg-dark-bg rounded transition-colors disabled:opacity-50"
            title="Refresh"
            type="button"
          >
            <RefreshCw className={`w-4 h-4 text-dark-muted ${loading ? 'animate-spin' : ''}`} />
          </button>
          {onSettings && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSettings(widget.id);
              }}
              className="p-1.5 hover:bg-dark-bg rounded transition-colors"
              title="Settings"
              type="button"
            >
              <Settings className="w-4 h-4 text-dark-muted" />
            </button>
          )}
          <button
            onClick={handleRemove}
            className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
            title="Remove"
            type="button"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">{children}</div>

      {/* Footer */}
      {lastUpdated && (
        <div className="mt-4 pt-4 border-t border-dark-border text-xs text-dark-muted text-center">
          <div>
            Last updated: {formatTime(lastUpdated)} {fromCache && '(from cache)'}
          </div>
          {fromCache && cacheAge !== null && (
            <div className="mt-1 flex items-center justify-center gap-2">
              <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-[10px] font-medium">
                Cached
              </span>
              <span className="text-[10px]">
                ({cacheAge}s ago)
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

