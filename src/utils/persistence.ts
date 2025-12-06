/**
 * Persistence Utilities
 * 
 * Functions for saving and loading widget configurations and layouts
 * to/from localStorage. Handles export/import of complete dashboard
 * configurations with validation and backward compatibility.
 */

import { WidgetConfig, DashboardExport } from '@/types';

// LocalStorage keys for different data types
const STORAGE_KEY = 'finboard-widgets'; // Widget configurations
const LAYOUT_KEY = 'finboard-layout'; // Legacy single layout (for backward compatibility)
const RESPONSIVE_LAYOUT_KEY = 'finboard-responsive-layouts'; // Responsive layouts for all breakpoints

/**
 * Type for responsive layouts across different screen breakpoints
 * Each breakpoint contains a map of widget IDs to their layout positions
 */
export type BreakpointLayouts = {
  lg?: Record<string, { x: number; y: number; w: number; h: number }>;
  md?: Record<string, { x: number; y: number; w: number; h: number }>;
  sm?: Record<string, { x: number; y: number; w: number; h: number }>;
  xs?: Record<string, { x: number; y: number; w: number; h: number }>;
  xxs?: Record<string, { x: number; y: number; w: number; h: number }>;
};

/**
 * Saves widget configurations to localStorage
 * @param widgets - Array of widget configurations to save
 */
export function saveWidgetsToStorage(widgets: WidgetConfig[]): void {
  try {
    // Always save, even if empty array (to clear storage when all widgets removed)
    const serializable = widgets.map((w) => ({
      ...w,
      createdAt: w.createdAt,
      lastUpdated: w.lastUpdated,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    console.log(`[Persistence] Saved ${widgets.length} widget(s) to localStorage`);
  } catch (error) {
    console.error('Failed to save widgets to storage:', error);
  }
}

/**
 * Loads widget configurations from localStorage
 * @returns Array of widget configurations or empty array if none found
 */
export function loadWidgetsFromStorage(): WidgetConfig[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load widgets from storage:', error);
  }
  return [];
}

/**
 * Legacy function - saves single layout to storage (for backward compatibility)
 * New code should use saveResponsiveLayoutsToStorage instead
 * @param layout - Single layout object keyed by widget ID
 */
export function saveLayoutToStorage(layout: Record<string, { x: number; y: number; w: number; h: number }>): void {
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  } catch (error) {
    console.error('Failed to save layout to storage:', error);
  }
}

/**
 * Legacy function - loads single layout from storage (for backward compatibility)
 * New code should use loadResponsiveLayoutsFromStorage instead
 * @returns Single layout object keyed by widget ID
 */
export function loadLayoutFromStorage(): Record<string, { x: number; y: number; w: number; h: number }> {
  try {
    const stored = localStorage.getItem(LAYOUT_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load layout from storage:', error);
  }
  return {};
}

/**
 * Save responsive layouts for all breakpoints
 */
export function saveResponsiveLayoutsToStorage(layouts: BreakpointLayouts): void {
  if (typeof window === 'undefined') {
    return; // Don't try to save during SSR
  }
  
  try {
    localStorage.setItem(RESPONSIVE_LAYOUT_KEY, JSON.stringify(layouts));
    console.log('[Persistence] Saved responsive layouts to storage:', Object.keys(layouts));
  } catch (error) {
    console.error('Failed to save responsive layouts to storage:', error);
  }
}

/**
 * Load responsive layouts for all breakpoints
 */
export function loadResponsiveLayoutsFromStorage(): BreakpointLayouts {
  if (typeof window === 'undefined') {
    return {}; // Return empty object during SSR
  }
  
  try {
    const stored = localStorage.getItem(RESPONSIVE_LAYOUT_KEY);
    if (stored) {
      const layouts = JSON.parse(stored);
      console.log('[Persistence] Loaded responsive layouts from storage:', Object.keys(layouts));
      return layouts;
    }
  } catch (error) {
    console.error('Failed to load responsive layouts from storage:', error);
  }
  return {};
}

/**
 * Convert react-grid-layout layouts format to our storage format
 * Input: { lg: [{i: 'id', x, y, w, h}], md: [...] }
 * Output: { lg: { 'id': {x, y, w, h} }, md: { 'id': {x, y, w, h} } }
 */
export function convertLayoutsToStorageFormat(
  layouts: Record<string, Array<{ i: string; x: number; y: number; w: number; h: number }>>
): BreakpointLayouts {
  const result: BreakpointLayouts = {};
  
  for (const [breakpoint, layoutArray] of Object.entries(layouts)) {
    const layoutMap: Record<string, { x: number; y: number; w: number; h: number }> = {};
    layoutArray.forEach((item) => {
      layoutMap[item.i] = {
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
      };
    });
    result[breakpoint as keyof BreakpointLayouts] = layoutMap;
  }
  
  return result;
}

/**
 * Convert storage format to react-grid-layout layouts format
 * Input: { lg: { 'id': {x, y, w, h} }, md: { 'id': {x, y, w, h} } }
 * Output: { lg: [{i: 'id', x, y, w, h}], md: [...] }
 */
export function convertStorageFormatToLayouts(
  storedLayouts: BreakpointLayouts,
  widgetIds: string[],
  widgets?: WidgetConfig[]
): Record<string, Array<{ i: string; x: number; y: number; w: number; h: number }>> {
  const result: Record<string, Array<{ i: string; x: number; y: number; w: number; h: number }>> = {};
  
  const breakpoints: Array<keyof BreakpointLayouts> = ['lg', 'md', 'sm', 'xs', 'xxs'];
  
  for (const breakpoint of breakpoints) {
    const layoutArray: Array<{ i: string; x: number; y: number; w: number; h: number }> = [];
    const storedLayout = storedLayouts[breakpoint];
    
    if (storedLayout) {
      // Use stored layouts, but skip widgets that have a layout property (newly added widgets)
      // Those will be handled below with proper widget-type-based sizing
      for (const [widgetId, layout] of Object.entries(storedLayout)) {
        if (widgetIds.includes(widgetId)) {
          // Check if this widget has a layout property (newly added)
          const widget = widgets?.find(w => w.id === widgetId);
          // Only use saved layout if widget doesn't have its own layout property
          if (!widget?.layout) {
            layoutArray.push({
              i: widgetId,
              x: layout.x,
              y: layout.y,
              w: layout.w,
              h: layout.h,
            });
          }
        }
      }
    }
    
    // Add any widgets that don't have stored layouts (new widgets)
    for (const widgetId of widgetIds) {
      if (!layoutArray.find((item) => item.i === widgetId)) {
        // Find widget config if available to get widget type for appropriate sizing
        const widget = widgets?.find(w => w.id === widgetId);
        // Calculate default position based on breakpoint and widget type
        const defaultLayout = calculateDefaultLayout(widgetId, widgetIds, breakpoint, widget);
        layoutArray.push(defaultLayout);
      }
    }
    
    result[breakpoint] = layoutArray;
  }
  
  return result;
}

/**
 * Calculates default layout position and size for a widget
 * Takes into account widget type (card/table/chart) and screen breakpoint
 * @param widgetId - ID of the widget
 * @param allWidgetIds - Array of all widget IDs (for position calculation)
 * @param breakpoint - Screen breakpoint (lg, md, sm, xs, xxs)
 * @param widget - Optional widget config for type-based sizing
 * @returns Default layout object with position and size
 */
function calculateDefaultLayout(
  widgetId: string,
  allWidgetIds: string[],
  breakpoint: keyof BreakpointLayouts,
  widget?: WidgetConfig
): { i: string; x: number; y: number; w: number; h: number } {
  const index = allWidgetIds.indexOf(widgetId);
  
  // Default column counts per breakpoint
  const cols: Record<string, number> = {
    lg: 12,
    md: 10,
    sm: 6,
    xs: 4,
    xxs: 2,
  };
  
  // Get widget-appropriate default sizes based on display mode
  const getWidgetSize = (displayMode?: string, chartType?: string) => {
    if (displayMode === 'chart') {
      return {
        lg: { w: 8, h: 6 },
        md: { w: 10, h: 6 },
        sm: { w: 6, h: 6 },
        xs: { w: 4, h: 5 },
        xxs: { w: 2, h: 4 },
      };
    }
    if (displayMode === 'table') {
      return {
        lg: { w: 6, h: 7 },
        md: { w: 5, h: 7 },
        sm: { w: 6, h: 6 },
        xs: { w: 4, h: 5 },
        xxs: { w: 2, h: 4 },
      };
    }
    // Card widgets (default)
    return {
      lg: { w: 4, h: 4 },
      md: { w: 5, h: 4 },
      sm: { w: 6, h: 4 },
      xs: { w: 4, h: 4 },
      xxs: { w: 2, h: 3 },
    };
  };
  
  const widgetSizes = getWidgetSize(widget?.displayMode, widget?.chartType);
  const sizeForBreakpoint = widgetSizes[breakpoint] || widgetSizes.lg;
  const defaultWidth = sizeForBreakpoint.w;
  const defaultHeight = sizeForBreakpoint.h;
  
  const colsForBreakpoint = cols[breakpoint] || 12;
  
  // Calculate position: place widgets in a grid
  const widgetsPerRow = Math.floor(colsForBreakpoint / defaultWidth);
  const x = (index % widgetsPerRow) * defaultWidth;
  const y = Math.floor(index / widgetsPerRow) * defaultHeight;
  
  return {
    i: widgetId,
    x: Math.min(x, colsForBreakpoint - defaultWidth),
    y,
    w: defaultWidth,
    h: defaultHeight,
  };
}


/**
 * Exports complete dashboard configuration to JSON string
 * Includes widgets, responsive layouts, and metadata
 * @param widgets - Array of widget configurations to export
 * @returns JSON string of complete dashboard configuration
 */
export function exportDashboardConfig(widgets: WidgetConfig[]): string {
  // Load responsive layouts from storage
  const responsiveLayouts = loadResponsiveLayoutsFromStorage();
  
  // Build complete dashboard export object
  const dashboardExport: DashboardExport = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    widgets: widgets.map((w) => ({
      ...w,
      createdAt: w.createdAt,
      lastUpdated: w.lastUpdated,
    })),
    layouts: responsiveLayouts,
    metadata: {
      widgetCount: widgets.length,
      layoutBreakpoints: Object.keys(responsiveLayouts),
    },
  };
  
  return JSON.stringify(dashboardExport, null, 2);
}

/**
 * Validation result for imported dashboard configuration
 */
/**
 * Result of dashboard import validation
 * Contains validation status, imported data, and any errors/warnings
 */
export interface ImportValidationResult {
  valid: boolean;
  widgets?: WidgetConfig[];
  layouts?: BreakpointLayouts;
  errors: string[];
  warnings: string[];
}

/**
 * Validate layout structure and coordinates
 */
function validateLayoutStructure(
  layouts: BreakpointLayouts,
  widgetIds: string[],
  breakpoint: keyof BreakpointLayouts,
  cols: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const layout = layouts[breakpoint];
  
  if (!layout) {
    return { valid: true, errors: [] }; // Missing layout is OK (optional)
  }
  
  // Validate each widget layout
  for (const [widgetId, layoutData] of Object.entries(layout)) {
    // Check if widget ID exists in widgets
    if (!widgetIds.includes(widgetId)) {
      errors.push(`Layout ${breakpoint}: Widget ID "${widgetId}" not found in widgets`);
      continue;
    }
    
    // Validate coordinates
    const { x, y, w, h } = layoutData;
    
    if (typeof x !== 'number' || x < 0) {
      errors.push(`Layout ${breakpoint}: Widget "${widgetId}" has invalid x coordinate: ${x}`);
    }
    
    if (typeof y !== 'number' || y < 0) {
      errors.push(`Layout ${breakpoint}: Widget "${widgetId}" has invalid y coordinate: ${y}`);
    }
    
    if (typeof w !== 'number' || w <= 0 || w > cols) {
      errors.push(`Layout ${breakpoint}: Widget "${widgetId}" has invalid width: ${w} (max: ${cols})`);
    }
    
    if (typeof h !== 'number' || h <= 0) {
      errors.push(`Layout ${breakpoint}: Widget "${widgetId}" has invalid height: ${h}`);
    }
    
    // Check if widget fits within grid
    if (x + w > cols) {
      errors.push(`Layout ${breakpoint}: Widget "${widgetId}" extends beyond grid (x: ${x}, w: ${w}, cols: ${cols})`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Validate all layouts for all breakpoints
 */
function validateAllLayouts(
  layouts: BreakpointLayouts | undefined,
  widgetIds: string[]
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!layouts || Object.keys(layouts).length === 0) {
    warnings.push('No layouts found in import. Layouts will be generated automatically.');
    return { valid: true, errors, warnings };
  }
  
  const breakpoints: Array<keyof BreakpointLayouts> = ['lg', 'md', 'sm', 'xs', 'xxs'];
  const cols: Record<string, number> = {
    lg: 12,
    md: 10,
    sm: 6,
    xs: 4,
    xxs: 2,
  };
  
  for (const breakpoint of breakpoints) {
    if (layouts[breakpoint]) {
      const validation = validateLayoutStructure(layouts, widgetIds, breakpoint, cols[breakpoint]);
      errors.push(...validation.errors);
    }
  }
  
  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Import dashboard configuration with validation
 * Supports both old format (array of widgets) and new format (DashboardExport object)
 */
export function importDashboardConfig(jsonString: string): ImportValidationResult {
  try {
    const parsed = JSON.parse(jsonString);
    
    // Handle old format (array of widgets) for backward compatibility
    if (Array.isArray(parsed)) {
      const widgets = parsed.filter((w) => 
        w && typeof w === 'object' && w.id && w.name && w.apiUrl
      );
      
      if (widgets.length === 0) {
        return {
          valid: false,
          errors: ['No valid widgets found in import file'],
          warnings: [],
        };
      }
      
      return {
        valid: true,
        widgets,
        layouts: undefined, // No layouts in old format
        errors: [],
        warnings: ['Imported file uses old format (no layouts). Layouts will be generated automatically.'],
      };
    }
    
    // Handle new format (DashboardExport object)
    if (typeof parsed === 'object' && parsed !== null) {
      const dashboardExport = parsed as Partial<DashboardExport>;
      
      // Validate widgets
      if (!Array.isArray(dashboardExport.widgets)) {
        return {
          valid: false,
          errors: ['Invalid dashboard configuration: widgets must be an array'],
          warnings: [],
        };
      }
      
      const widgets = dashboardExport.widgets.filter((w) => 
        w && typeof w === 'object' && w.id && w.name && w.apiUrl && Array.isArray(w.selectedFields)
      );
      
      if (widgets.length === 0) {
        return {
          valid: false,
          errors: ['No valid widgets found in import file'],
          warnings: [],
        };
      }
      
      const widgetIds = widgets.map((w) => w.id);
      const errors: string[] = [];
      const warnings: string[] = [];
      
      // Validate layouts if present
      let layouts: BreakpointLayouts | undefined = undefined;
      if (dashboardExport.layouts) {
        layouts = dashboardExport.layouts as BreakpointLayouts;
        const layoutValidation = validateAllLayouts(layouts, widgetIds);
        errors.push(...layoutValidation.errors);
        warnings.push(...layoutValidation.warnings);
        
        // If layouts have errors, we'll still import but warn the user
        if (layoutValidation.errors.length > 0) {
          warnings.push('Some layout data is invalid. Invalid layouts will be ignored and regenerated.');
        }
      } else {
        warnings.push('No layouts found in import. Layouts will be generated automatically.');
      }
      
      // Add metadata warnings if present
      if (dashboardExport.metadata) {
        if (dashboardExport.metadata.widgetCount !== widgets.length) {
          warnings.push(`Metadata indicates ${dashboardExport.metadata.widgetCount} widgets, but ${widgets.length} valid widgets were found.`);
        }
      }
      
      return {
        valid: errors.length === 0 || widgets.length > 0, // Valid if we have widgets, even if layouts have errors
        widgets,
        layouts,
        errors,
        warnings,
      };
    }
    
    return {
      valid: false,
      errors: ['Invalid dashboard configuration format'],
      warnings: [],
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: [],
    };
  }
}