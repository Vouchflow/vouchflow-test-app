import { useState, useCallback, useRef } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import type { LogEntry } from '../sdk/types';

const MAX_ENTRIES = 500;

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export interface UseLoggerResult {
  entries: LogEntry[];
  log: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  clear: () => void;
  copyAll: () => void;
}

export function useLogger(): UseLoggerResult {
  const [entries, setEntries] = useState<LogEntry[]>([]);

  const log = useCallback((entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    const full: LogEntry = {
      ...entry,
      id: makeId(),
      timestamp: Date.now(),
    };
    setEntries(prev => {
      const next = [...prev, full];
      if (next.length > MAX_ENTRIES) {
        return next.slice(next.length - MAX_ENTRIES);
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setEntries([]);
  }, []);

  const copyAll = useCallback(() => {
    setEntries(prev => {
      const text = prev
        .map(e => {
          const ts = new Date(e.timestamp).toISOString();
          const status = e.statusCode ? ` [${e.statusCode}]` : '';
          const latency = e.latencyMs ? ` +${e.latencyMs}ms` : '';
          return `${ts} ${e.direction === 'out' ? '→' : e.direction === 'in' ? '←' : '⚡'} ${e.method} ${e.endpoint}${status}${latency}`;
        })
        .join('\n');
      Clipboard.setString(text);
      return prev;
    });
  }, []);

  return { entries, log, clear, copyAll };
}
