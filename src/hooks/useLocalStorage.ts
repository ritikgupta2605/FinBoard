/**
 * LocalStorage Persistence Hook
 * 
 * Manages automatic saving and loading of widget configurations to/from localStorage.
 * Ensures widgets persist across page refreshes and browser sessions.
 */

import { useEffect, useRef } from 'react';
import { useAppSelector } from '@/store/hooks';
import { saveWidgetsToStorage, loadWidgetsFromStorage } from '@/utils/persistence';
import { useAppDispatch } from '@/store/hooks';
import { setWidgets } from '@/store/slices/widgetsSlice';

/**
 * Hook that handles localStorage persistence for widgets
 * - Loads widgets from localStorage on initial mount
 * - Saves widgets to localStorage whenever they change
 */
export function useLocalStoragePersistence() {
  const widgets = useAppSelector((state) => state.widgets.widgets);
  const dispatch = useAppDispatch();
  const hasLoadedRef = useRef(false); // Track if initial load has completed

  // Load from storage ONLY once on initial mount
  // This prevents overwriting Redux state with stale localStorage data on every render
  useEffect(() => {
    if (!hasLoadedRef.current) {
      const stored = loadWidgetsFromStorage();
      if (stored.length > 0) {
        dispatch(setWidgets(stored));
      }
      hasLoadedRef.current = true; // Mark as loaded
    }
  }, [dispatch]);

  // Save to storage whenever widgets change (including empty array to clear storage)
  // Only saves after initial load is complete to avoid overwriting with empty array on mount
  useEffect(() => {
    if (hasLoadedRef.current) {
      saveWidgetsToStorage(widgets);
    }
  }, [widgets]);
}


