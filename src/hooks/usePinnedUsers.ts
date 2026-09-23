import { useCallback, useState } from 'react';

const STORAGE_KEY = 'repo-deck:pinned';
const LIMIT = 12;

function read(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function write(list: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Blocked storage: pins still work for this session, they just will not
    // survive a reload.
  }
}

/**
 * Handles the viewer has pinned. Kept separate from recents because they mean
 * different things: recents are automatic and get evicted, pins are deliberate
 * and stay until removed.
 */
export function usePinnedUsers(): {
  pinned: string[];
  isPinned: (login: string) => boolean;
  togglePin: (login: string) => void;
} {
  const [pinned, setPinned] = useState<string[]>(read);

  const isPinned = useCallback(
    (login: string) => pinned.some((n) => n.toLowerCase() === login.toLowerCase()),
    [pinned],
  );

  const togglePin = useCallback((login: string) => {
    const handle = login.trim();
    if (!handle) return;

    setPinned((current) => {
      const exists = current.some((n) => n.toLowerCase() === handle.toLowerCase());
      const next = exists
        ? current.filter((n) => n.toLowerCase() !== handle.toLowerCase())
        : [handle, ...current].slice(0, LIMIT);
      write(next);
      return next;
    });
  }, []);

  return { pinned, isPinned, togglePin };
}
