/**
 * Typed Redux Hooks
 * 
 * Provides type-safe versions of Redux hooks.
 * These hooks are pre-configured with our store types for better TypeScript support.
 */

import { useDispatch, useSelector, useStore } from 'react-redux';
import type { AppDispatch, AppStore, RootState } from './store';

// Type-safe dispatch hook
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();

// Type-safe selector hook
export const useAppSelector = useSelector.withTypes<RootState>();

// Type-safe store hook
export const useAppStore = useStore.withTypes<AppStore>();



