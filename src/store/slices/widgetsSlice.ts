/**
 * Widgets Redux Slice
 * 
 * Manages widget state using Redux Toolkit.
 * Provides actions for adding, removing, updating, and managing widget configurations.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { WidgetConfig } from '@/types';

/**
 * State interface for widgets slice
 */
interface WidgetsState {
  widgets: WidgetConfig[]; // Array of all widget configurations
}

// Initial state - empty widgets array
const initialState: WidgetsState = {
  widgets: [],
};

/**
 * Redux slice for widget management
 * Uses Immer under the hood for immutable state updates
 */
const widgetsSlice = createSlice({
  name: 'widgets',
  initialState,
  reducers: {
    /**
     * Add a new widget to the dashboard
     * @param state - Current widgets state
     * @param action - Widget configuration to add
     */
    addWidget: (state, action: PayloadAction<WidgetConfig>) => {
      state.widgets.push(action.payload);
    },
    
    /**
     * Remove a widget from the dashboard by ID
     * @param state - Current widgets state
     * @param action - Widget ID to remove
     */
    removeWidget: (state, action: PayloadAction<string>) => {
      state.widgets = state.widgets.filter((w) => w.id !== action.payload);
    },
    
    /**
     * Update a widget's configuration (partial update)
     * @param state - Current widgets state
     * @param action - Widget ID and partial config to update
     */
    updateWidget: (state, action: PayloadAction<{ id: string; config: Partial<WidgetConfig> }>) => {
      const index = state.widgets.findIndex((w) => w.id === action.payload.id);
      if (index !== -1) {
        // Merge existing config with new config
        state.widgets[index] = { ...state.widgets[index], ...action.payload.config };
      }
    },
    
    /**
     * Update a widget's grid layout position and size
     * @param state - Current widgets state
     * @param action - Widget ID and new layout coordinates
     */
    updateWidgetLayout: (
      state,
      action: PayloadAction<{ id: string; layout: { x: number; y: number; w: number; h: number } }>
    ) => {
      const index = state.widgets.findIndex((w) => w.id === action.payload.id);
      if (index !== -1) {
        state.widgets[index].layout = action.payload.layout;
      }
    },
    
    /**
     * Replace all widgets with a new array (used for import/load)
     * @param state - Current widgets state
     * @param action - New array of widgets
     */
    setWidgets: (state, action: PayloadAction<WidgetConfig[]>) => {
      state.widgets = action.payload;
    },
    
    /**
     * Update the last updated timestamp for a widget
     * @param state - Current widgets state
     * @param action - Widget ID and timestamp
     */
    updateWidgetLastUpdated: (state, action: PayloadAction<{ id: string; timestamp: number }>) => {
      const index = state.widgets.findIndex((w) => w.id === action.payload.id);
      if (index !== -1) {
        state.widgets[index].lastUpdated = action.payload.timestamp;
      }
    },
  },
});

export const {
  addWidget,
  removeWidget,
  updateWidget,
  updateWidgetLayout,
  setWidgets,
  updateWidgetLastUpdated,
} = widgetsSlice.actions;

export default widgetsSlice.reducer;


