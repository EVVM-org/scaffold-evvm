'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { DebugEntry } from '@/types/evvm';

interface DebugContextType {
  entries: DebugEntry[];
  addEntry: (entry: Omit<DebugEntry, 'timestamp'>) => void;
  clearEntries: () => void;
  logRequest: (label: string, payload: any) => void;
  logResponse: (label: string, payload: any) => void;
  logError: (label: string, payload: any) => void;
  logInfo: (label: string, payload: any) => void;
  logTransaction: (label: string, payload: any, txHash?: string) => void;
  logBlock: (label: string, payload: any, blockNumber?: number) => void;
  logSignature: (label: string, payload: any) => void;
  logWallet: (label: string, payload: any) => void;
}

const DebugContext = createContext<DebugContextType | null>(null);

const MAX_ENTRIES = 200;

export function DebugProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<DebugEntry[]>([]);

  // Listen to console.log in development to also capture browser console logs
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    // Override console methods to capture logs
    console.log = (...args) => {
      originalConsoleLog.apply(console, args);
      // Optionally capture logs with [DEBUG] prefix
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');

      if (message.startsWith('[EVVM]') || message.startsWith('[DEBUG]')) {
        setEntries(prev => {
          const newEntries = [...prev, {
            type: 'info' as const,
            label: 'Console Log',
            payload: message,
            timestamp: Date.now()
          }];
          return newEntries.slice(-MAX_ENTRIES);
        });
      }
    };

    console.error = (...args) => {
      originalConsoleError.apply(console, args);
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');

      setEntries(prev => {
        const newEntries = [...prev, {
          type: 'error' as const,
          label: 'Console Error',
          payload: message,
          timestamp: Date.now()
        }];
        return newEntries.slice(-MAX_ENTRIES);
      });
    };

    console.warn = (...args) => {
      originalConsoleWarn.apply(console, args);
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');

      if (message.startsWith('[EVVM]') || message.startsWith('[WARN]')) {
        setEntries(prev => {
          const newEntries = [...prev, {
            type: 'info' as const,
            label: 'Console Warning',
            payload: message,
            timestamp: Date.now()
          }];
          return newEntries.slice(-MAX_ENTRIES);
        });
      }
    };

    return () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    };
  }, []);

  const addEntry = useCallback((entry: Omit<DebugEntry, 'timestamp'>) => {
    setEntries(prev => {
      const newEntries = [...prev, { ...entry, timestamp: Date.now() }];
      return newEntries.slice(-MAX_ENTRIES);
    });
  }, []);

  const clearEntries = useCallback(() => {
    setEntries([]);
  }, []);

  const logRequest = useCallback((label: string, payload: any) => {
    addEntry({ type: 'request', label, payload });
  }, [addEntry]);

  const logResponse = useCallback((label: string, payload: any) => {
    addEntry({ type: 'response', label, payload });
  }, [addEntry]);

  const logError = useCallback((label: string, payload: any) => {
    addEntry({ type: 'error', label, payload });
  }, [addEntry]);

  const logInfo = useCallback((label: string, payload: any) => {
    addEntry({ type: 'info', label, payload });
  }, [addEntry]);

  const logTransaction = useCallback((label: string, payload: any, txHash?: string) => {
    addEntry({ type: 'tx', label, payload, txHash });
  }, [addEntry]);

  const logBlock = useCallback((label: string, payload: any, blockNumber?: number) => {
    addEntry({ type: 'block', label, payload, blockNumber });
  }, [addEntry]);

  const logSignature = useCallback((label: string, payload: any) => {
    addEntry({ type: 'signature', label, payload });
  }, [addEntry]);

  const logWallet = useCallback((label: string, payload: any) => {
    addEntry({ type: 'wallet', label, payload });
  }, [addEntry]);

  return (
    <DebugContext.Provider value={{
      entries,
      addEntry,
      clearEntries,
      logRequest,
      logResponse,
      logError,
      logInfo,
      logTransaction,
      logBlock,
      logSignature,
      logWallet
    }}>
      {children}
    </DebugContext.Provider>
  );
}

export function useDebug() {
  const context = useContext(DebugContext);
  if (!context) {
    throw new Error('useDebug must be used within a DebugProvider');
  }
  return context;
}
