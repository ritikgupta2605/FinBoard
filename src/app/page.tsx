'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, BarChart3 } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { addWidget, removeWidget, updateWidget, updateWidgetLayout } from '@/store/slices/widgetsSlice';
import { WidgetConfig } from '@/types';
import { useLocalStoragePersistence } from '@/hooks/useLocalStorage';
import { generateWidgetId } from '@/utils/helpers';
import {
  loadLayoutFromStorage,
  loadResponsiveLayoutsFromStorage,
  saveResponsiveLayoutsToStorage,
  convertLayoutsToStorageFormat,
  convertStorageFormatToLayouts,
  type BreakpointLayouts,
} from '@/utils/persistence';
import AddWidgetModal from '@/components/AddWidgetModal';
import EditWidgetModal from '@/components/EditWidgetModal';
import WidgetContainer from '@/components/WidgetContainer';
import WidgetRenderer from '@/components/widgets';
import { useWidgetData } from '@/hooks/useWidgetData';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

/**
 * Main dashboard component
 * @returns Dashboard JSX with widgets, modals, and controls
 */
export default function Dashboard() {
  const dispatch = useAppDispatch();
  const widgets = useAppSelector((state) => state.widgets.widgets);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<WidgetConfig | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const isUpdatingLayoutsRef = useRef(false);
  
  useLocalStoragePersistence();

  useEffect(() => {
    const savedResponsiveLayouts = loadResponsiveLayoutsFromStorage();
    
    if (Object.keys(savedResponsiveLayouts).length > 0) {
      // We have responsive layouts saved - they will be used when generating layouts
      console.log('[Dashboard] Loaded responsive layouts for breakpoints:', Object.keys(savedResponsiveLayouts));
    } else {
      // Fallback to legacy single layout format for backward compatibility
      const savedLayout = loadLayoutFromStorage();
      if (Object.keys(savedLayout).length > 0) {
        // Migrate legacy layout to responsive format (apply to lg breakpoint)
        const migratedLayouts: BreakpointLayouts = {
          lg: savedLayout,
        };
        saveResponsiveLayoutsToStorage(migratedLayouts);
        console.log('[Dashboard] Migrated legacy layout to responsive format');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Calculate appropriate default size based on widget type
  const getDefaultWidgetSize = (displayMode: string, chartType?: string) => {
    // Chart widgets need more space
    if (displayMode === 'chart') {
      return {
        w: 8, // Wider for better chart visibility
        h: 6, // Taller for better chart visibility
      };
    }
    // Table widgets need more vertical space
    if (displayMode === 'table') {
      return {
        w: 6, // Standard width
        h: 7, // Taller for table rows
      };
    }
    // Card widgets can be more compact
    return {
      w: 4, // Compact width
      h: 4, // Standard height
    };
  };

  const handleAddWidget = (widgetConfig: Omit<WidgetConfig, 'id' | 'createdAt' | 'lastUpdated'>) => {
    const defaultSize = getDefaultWidgetSize(widgetConfig.displayMode, widgetConfig.chartType);
    
    // Calculate position based on existing widgets' positions
    let nextX = 0;
    let nextY = 0;
    const cols = 12; // lg breakpoint columns
    
    if (widgets.length > 0) {
      // Find the rightmost edge and bottommost edge of all existing widgets
      let maxRightEdge = 0;
      let maxBottomEdge = 0;
      
      widgets.forEach((widget) => {
        if (widget.layout) {
          const rightEdge = widget.layout.x + widget.layout.w;
          const bottomEdge = widget.layout.y + widget.layout.h;
          maxRightEdge = Math.max(maxRightEdge, rightEdge);
          maxBottomEdge = Math.max(maxBottomEdge, bottomEdge);
        }
      });
      
      // Try to place next to the rightmost widget
      if (maxRightEdge + defaultSize.w <= cols) {
        // Fits on the same row
        nextX = maxRightEdge;
        nextY = 0; // Place in the first row
      } else {
        // Doesn't fit, wrap to next row
        nextX = 0;
        nextY = maxBottomEdge;
      }
    }
    
    const newWidget: WidgetConfig = {
      ...widgetConfig,
      id: generateWidgetId(),
      createdAt: Date.now(),
      layout: {
        x: nextX,
        y: nextY,
        w: defaultSize.w,
        h: defaultSize.h,
      },
    };
    
    console.log('[handleAddWidget] New widget layout:', newWidget.layout);
    
    // Set flag to prevent handleLayoutChange from saving layouts during the initial setup
    isUpdatingLayoutsRef.current = true;
    console.log('[handleAddWidget] Set isUpdatingLayouts flag');
    
    // Clear all saved layouts before adding widget - this ensures fresh layout generation
    console.log('[handleAddWidget] Clearing saved layouts from localStorage');
    saveResponsiveLayoutsToStorage({});
    console.log('[handleAddWidget] Saved layouts cleared');
    
    dispatch(addWidget(newWidget));
    console.log('[handleAddWidget] Widget dispatched to Redux');
    
    // The flag will be reset by the useEffect after layout generation completes
    // This prevents handleLayoutChange from interfering during the layout update
  };

  const handleRemoveWidget = (id: string) => {
    console.log('Removing widget:', id);
    
    // Remove the widget from Redux
    dispatch(removeWidget(id));
    
    // Clear saved layouts to force recalculation
    saveResponsiveLayoutsToStorage({});
    
    // Set flag to prevent handleLayoutChange from interfering
    isUpdatingLayoutsRef.current = true;
    
    // Reset flag after layout update completes
    setTimeout(() => {
      isUpdatingLayoutsRef.current = false;
    }, 150);
  };

  const handleEditWidget = (id: string) => {
    const widget = widgets.find((w) => w.id === id);
    if (widget) {
      setEditingWidget(widget);
      setIsEditModalOpen(true);
    }
  };

  const handleSaveWidget = (id: string, updates: Partial<WidgetConfig>) => {
    dispatch(updateWidget({ id, config: updates }));
    setIsEditModalOpen(false);
    setEditingWidget(null);
  };

  const handleLayoutChange = (
        currentLayout: Array<{ i: string; x: number; y: number; w: number; h: number }>,
        allLayouts: Record<string, Array<{ i: string; x: number; y: number; w: number; h: number }>>
      ) => {
    // Skip if we're updating layouts programmatically (to prevent infinite loops)
    if (isUpdatingLayoutsRef.current) {
      return;
    }
    
    // Update Redux state with current breakpoint layout (for backward compatibility)
    // We'll use the 'lg' layout as the primary one stored in widget config
    const lgLayout = allLayouts.lg || currentLayout;
    const layoutMap: Record<string, { x: number; y: number; w: number; h: number }> = {};
    
    lgLayout.forEach((item) => {
      const layoutData = {
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
      };
      
      // Only update if layout actually changed (prevent unnecessary updates)
      const widget = widgets.find(w => w.id === item.i);
      if (widget?.layout) {
        const currentLayout = widget.layout;
        // For newly added widgets (created less than 2 seconds ago), always allow size updates
        // This ensures the correct size gets applied even if handleLayoutChange fires early
        const isNewWidget = widget.createdAt && (Date.now() - widget.createdAt) < 2000;
        
        if (
          !isNewWidget &&
          currentLayout.x === layoutData.x &&
          currentLayout.y === layoutData.y &&
          currentLayout.w === layoutData.w &&
          currentLayout.h === layoutData.h
        ) {
          // Layout hasn't changed, skip update
          return;
        }
        
        // For new widgets, if the incoming size is smaller than the widget's intended size,
        // use the widget's intended size instead (prevents small initial sizes from being saved)
        if (isNewWidget && (layoutData.w < currentLayout.w || layoutData.h < currentLayout.h)) {
          layoutData.w = Math.max(layoutData.w, currentLayout.w);
          layoutData.h = Math.max(layoutData.h, currentLayout.h);
        }
      }
      
      layoutMap[item.i] = layoutData;
      
      dispatch(
        updateWidgetLayout({
          id: item.i,
          layout: layoutData,
        })
      );
    });
    
    // Save all breakpoint layouts to localStorage
    const storageFormat = convertLayoutsToStorageFormat(allLayouts);
    saveResponsiveLayoutsToStorage(storageFormat);
    console.log('[Dashboard] Saved responsive layouts for breakpoints:', Object.keys(allLayouts));
  };

  // Generate layouts for all breakpoints (client-side only)
  const [layouts, setLayouts] = useState<Record<string, Array<{ i: string; x: number; y: number; w: number; h: number }>>>(() => {
    // Initial empty layout for SSR
    return {    // Set flag to prevent handleLayoutChange from triggering during programmatic updates

      lg: [],
      md: [],
      sm: [],
      xs: [],
      xxs: [],
    };
  });

  // Generate layouts on client side after mount
  useEffect(() => {
    isUpdatingLayoutsRef.current = true;
    
    const generateLayouts = (): Record<string, Array<{ i: string; x: number; y: number; w: number; h: number }>> => {
      const savedResponsiveLayouts = loadResponsiveLayoutsFromStorage();
      const widgetIds = widgets.map((w) => w.id);
      
      console.log('[generateLayouts] Widgets:', widgets.length, 'Saved layouts keys:', Object.keys(savedResponsiveLayouts));
      console.log('[generateLayouts] Widgets with layouts:', widgets.filter(w => w.layout).map(w => ({id: w.id, layout: w.layout})));
      
      // If we have saved responsive layouts, use them (with fallback for new widgets)
      // But prioritize widget.layout property for widgets that have it (newly added widgets)
      if (Object.keys(savedResponsiveLayouts).length > 0) {
        const convertedLayouts = convertStorageFormatToLayouts(savedResponsiveLayouts, widgetIds, widgets);
        
        // Override with widget.layout for newly added widgets (widgets with layout property)
        // This ensures new widgets get their appropriate sizes
        const breakpoints: Array<'lg' | 'md' | 'sm' | 'xs' | 'xxs'> = ['lg', 'md', 'sm', 'xs', 'xxs'];
        breakpoints.forEach((breakpoint) => {
          widgets.forEach((widget) => {
            // If widget has a layout property, ALWAYS use it (for newly added widgets)
            // This ensures new widgets get their appropriate sizes regardless of saved layouts
            if (widget.layout) {
              let layoutIndex = convertedLayouts[breakpoint].findIndex((l) => l.i === widget.id);
              
              // If widget not found in converted layouts, add it
              if (layoutIndex === -1) {
                convertedLayouts[breakpoint].push({
                  i: widget.id,
                  x: widget.layout.x,
                  y: widget.layout.y,
                  w: widget.layout.w,
                  h: widget.layout.h,
                });
              } else {
                if (breakpoint === 'lg') {
                  // Use the widget.layout for lg breakpoint
                  convertedLayouts[breakpoint][layoutIndex] = {
                    i: widget.id,
                    x: widget.layout.x,
                    y: widget.layout.y,
                    w: widget.layout.w,
                    h: widget.layout.h,
                  };
                } else {
                  // For other breakpoints, use widget-type-based sizes but keep position from lg
                  const getWidgetSize = (displayMode: string, chartType?: string) => {
                    if (displayMode === 'chart') {
                      return { lg: { w: 8, h: 6 }, md: { w: 10, h: 6 }, sm: { w: 6, h: 6 }, xs: { w: 4, h: 5 }, xxs: { w: 2, h: 4 } };
                    }
                    if (displayMode === 'table') {
                      return { lg: { w: 6, h: 7 }, md: { w: 5, h: 7 }, sm: { w: 6, h: 6 }, xs: { w: 4, h: 5 }, xxs: { w: 2, h: 4 } };
                    }
                    return { lg: { w: 4, h: 4 }, md: { w: 5, h: 4 }, sm: { w: 6, h: 4 }, xs: { w: 4, h: 4 }, xxs: { w: 2, h: 3 } };
                  };
                  const widgetSizes = getWidgetSize(widget.displayMode, widget.chartType);
                  const sizeForBreakpoint = widgetSizes[breakpoint] || widgetSizes.lg;
                  convertedLayouts[breakpoint][layoutIndex] = {
                    ...convertedLayouts[breakpoint][layoutIndex],
                    x: widget.layout.x, // Keep x position from widget.layout
                    y: widget.layout.y, // Keep y position from widget.layout
                    w: sizeForBreakpoint.w,
                    h: sizeForBreakpoint.h,
                  };
                }
              }
            }
          });
        });
        
        return convertedLayouts;
      }
      
      // Otherwise, generate default layouts for all breakpoints
      // When there are no saved layouts, recalculate positions based on widget order
      const breakpoints: Array<'lg' | 'md' | 'sm' | 'xs' | 'xxs'> = ['lg', 'md', 'sm', 'xs', 'xxs'];
      const generatedLayouts: Record<string, Array<{ i: string; x: number; y: number; w: number; h: number }>> = {};
      
      breakpoints.forEach((breakpoint) => {
        generatedLayouts[breakpoint] = widgets.map((widget, index) => {
          // Recalculate positions based on widget order to fill gaps
          // For 'lg' breakpoint: calculate based on widget sizes and fit them in rows
          if (breakpoint === 'lg') {
            // Get the sizes for all widgets to calculate proper layout
            const cols = 12;
            let currentX = 0;
            let currentY = 0;
            let maxYInRow = 0;
            
            // Calculate position for this widget based on all previous widgets
            let xPos = 0;
            let yPos = 0;
            
            for (let i = 0; i < index; i++) {
              const w = widgets[i];
              const size = getDefaultWidgetSize(w.displayMode, w.chartType);
              if (i === 0) {
                xPos = size.w;
                yPos = 0;
                maxYInRow = size.h;
              } else {
                if (xPos + size.w <= cols) {
                  xPos += size.w;
                  maxYInRow = Math.max(maxYInRow, size.h);
                } else {
                  xPos = size.w;
                  yPos += maxYInRow;
                  maxYInRow = size.h;
                }
              }
            }
            
            // Now place current widget
            const currentSize = getDefaultWidgetSize(widget.displayMode, widget.chartType);
            if (index === 0) {
              xPos = 0;
              yPos = 0;
            } else {
              if (xPos + currentSize.w > cols) {
                // Wrap to next row
                xPos = 0;
                yPos += maxYInRow;
              }
            }
            
            return {
              i: widget.id,
              x: xPos,
              y: yPos,
              w: currentSize.w,
              h: currentSize.h,
            };
          }
          
          // For other breakpoints, use widget-specific sizes but recalculate positions
          const sizeForBreakpoint = widget.displayMode === 'chart' 
            ? { w: 8, h: 6 }
            : widget.displayMode === 'table' 
            ? { w: 6, h: 7 }
            : { w: 4, h: 4 };
          
          const cols: Record<string, number> = {
            lg: 12,
            md: 10,
            sm: 6,
            xs: 4,
            xxs: 2,
          };
          
          const colsForBreakpoint = cols[breakpoint] || 12;
          const widgetsPerRow = Math.floor(colsForBreakpoint / sizeForBreakpoint.w);
          const x = (index % widgetsPerRow) * sizeForBreakpoint.w;
          const y = Math.floor(index / widgetsPerRow) * sizeForBreakpoint.h;
          
          return {
            i: widget.id,
            x: Math.min(x, colsForBreakpoint - sizeForBreakpoint.w),
            y,
            w: sizeForBreakpoint.w,
            h: sizeForBreakpoint.h,
          };
        });
      });
      
      return generatedLayouts;
    };

    const generatedLayouts = generateLayouts();

    // Sanitize generated layouts: ensure every layout item has numeric x,y,w,h
    Object.keys(generatedLayouts).forEach((bp) => {
      const list = generatedLayouts[bp] || [];
      // track a fallback y position to place items without coords
      let maxY = 0;
      list.forEach((item, idx) => {
        if (typeof item.x !== 'number' || Number.isNaN(item.x)) {
          item.x = 0;
        }
        if (typeof item.y !== 'number' || Number.isNaN(item.y)) {
          item.y = maxY;
        }
        if (typeof item.w !== 'number' || Number.isNaN(item.w)) {
          item.w = 4;
        }
        if (typeof item.h !== 'number' || Number.isNaN(item.h)) {
          item.h = 4;
        }
        maxY = Math.max(maxY, item.y + item.h);
      });
      generatedLayouts[bp] = list;
    });

    console.log('[generateLayouts] Final layouts.lg:', generatedLayouts.lg);
    setLayouts(generatedLayouts);
    
    // Reset flag after a short delay to allow layout updates to complete
    setTimeout(() => {
      console.log('[generateLayouts] Resetting isUpdatingLayouts flag');
      isUpdatingLayoutsRef.current = false;
    }, 100);
  }, [widgets]);

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="border-b border-dark-border bg-dark-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold text-dark-text">FINBOARD</h1>
            </div>
            <p className="text-sm text-dark-muted mt-1">
              {widgets.length} active widget{widgets.length !== 1 ? 's' : ''} • Real-time data
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />

            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Widget
            </button>
          </div>
        </div>

      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {widgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="mb-6">
              <BarChart3 className="w-24 h-24 text-dark-muted mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-dark-text mb-2">
                Build Your Finance Dashboard
              </h2>
              <p className="text-dark-muted max-w-md">
                Create custom widgets by connecting to any finance API. Track stocks, crypto, forex,
                or economic indicators – all in real-time.
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Your First Widget
            </button>
          </div>
        ) : (
          <ResponsiveGridLayout
            className="layout"
            layouts={layouts}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={60}
            compactType={null}
            preventCollision={false}
            onLayoutChange={handleLayoutChange}
            draggableHandle=".drag-handle"
          >
            {widgets.map((widget) => (
              <div key={widget.id}>
                <WidgetWrapper 
                  widget={widget} 
                  onRemove={handleRemoveWidget}
                  onEdit={handleEditWidget}
                />
              </div>
            ))}
          </ResponsiveGridLayout>
        )}

        {/* Add Widget Placeholder */}
        {widgets.length > 0 && (
          <div
            onClick={() => setIsModalOpen(true)}
            className="mt-8 border-2 border-dashed border-primary/50 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
          >
            <Plus className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-dark-text mb-2">Add Widget</h3>
            <p className="text-sm text-dark-muted">
              Connect to a finance API and create a custom widget
            </p>
          </div>
        )}
      </main>

      {/* Add Widget Modal */}
      <AddWidgetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddWidget}
      />

      {/* Edit Widget Modal */}
      <EditWidgetModal
        isOpen={isEditModalOpen}
        widget={editingWidget}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingWidget(null);
        }}
        onSave={handleSaveWidget}
      />
    </div>
  );
}

/**
 * Widget Wrapper Component
 * 
 * Wraps individual widgets to handle data fetching and currency detection.
 * Automatically updates widget configuration when currency is detected from API.
 */
function WidgetWrapper({
  widget,
  onRemove,
  onEdit,
}: {
  widget: WidgetConfig;
  onRemove: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const dispatch = useAppDispatch();
  const { loading, error, lastUpdated, refresh, fromCache, cacheAge, detectedCurrency } = useWidgetData(widget);

  // Update widget config in Redux when currency is detected from API response
  // Only updates if currency changed to avoid unnecessary re-renders
  useEffect(() => {
    if (detectedCurrency && (!widget.detectedCurrency || 
        widget.detectedCurrency.code !== detectedCurrency.code ||
        widget.detectedCurrency.path !== detectedCurrency.path)) {
      dispatch(updateWidget({
        id: widget.id,
        config: { detectedCurrency }
      }));
    }
  }, [detectedCurrency, widget.id, widget.detectedCurrency, dispatch]);

  return (
    <WidgetContainer
      widget={widget}
      onRemove={onRemove}
      onRefresh={refresh}
      onSettings={onEdit}
      loading={loading}
      lastUpdated={lastUpdated}
      fromCache={fromCache}
      cacheAge={cacheAge}
    >
      <WidgetRenderer widget={widget} />
    </WidgetContainer>
  );
}

