/**
 * Redux Store Provider Component
 * 
 * Wraps the application with Redux Provider.
 * Uses useRef to ensure store is only created once (prevents re-creation on re-renders).
 */

'use client';

import { useRef } from 'react';
import { Provider } from 'react-redux';
import { makeStore } from './store';

/**
 * Provides Redux store to the component tree
 * @param children - Child components that need access to the store
 */
export default function StoreProvider({ children }: { children: React.ReactNode }) {
  // Use ref to persist store instance across re-renders
  const storeRef = useRef<ReturnType<typeof makeStore>>();
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  return <Provider store={storeRef.current}>{children}</Provider>;
}



