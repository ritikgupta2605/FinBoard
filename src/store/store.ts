/**
 * Redux Store Configuration
 * 
 * Configures the Redux store for state management.
 * Uses Redux Toolkit for simplified store setup.
 */

import { configureStore } from '@reduxjs/toolkit';
import widgetsReducer from './slices/widgetsSlice';

/**
 * Creates and configures the Redux store
 * @returns Configured Redux store instance
 */
export const makeStore = () => {
  return configureStore({
    reducer: {
      widgets: widgetsReducer, // Widget state management reducer
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          // Ignore serialization checks for widget actions (widgets may contain non-serializable data)
          ignoredActions: ['widgets/addWidget', 'widgets/updateWidget'],
        },
      }),
  });
};

// TypeScript types for the store
export type AppStore = ReturnType<typeof makeStore>; // Store instance type
export type RootState = ReturnType<AppStore['getState']>; // Root state type
export type AppDispatch = AppStore['dispatch']; // Dispatch function type



