import { useCallback, useState } from 'react';

const STORAGE_KEY = 'repo-deck:recent';
const LIMIT = 8;

function read(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    // Private browsing, blocked storage, or a corrupted value: recents are a
    // convenience, so losing them is never worth an error.
    return [];
  }
}

/** Recently explored handles, newest first. Per-browser, never synced. */
export function useRecentUsers(): {
  recent: string[];
  remember: (login: string) => void;
} {
  const [recent, setRecent] = useState<string[]>(read);

  const remember = useCallback((login: string) => {
    const handle = login.trim();
    if (!handle) return;

    setRecent((current) => {
      const next = [handle, ...current.filter((n) => n.toLowerCase() !== handle.toLowerCase())].slice(
        0,
        LIMIT,
      );
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Keep it for this session even if it cannot be persisted.
      }
      return next;
    });
  }, []);

  return { recent, remember };
}
