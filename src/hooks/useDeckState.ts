import { useCallback, useEffect, useRef, useState } from 'react';
import type { SortKey } from '../types';
import { useDebouncedValue } from './useDebouncedValue';

export interface DeckState {
  username: string;
  search: string;
  language: string | null;
  topic: string | null;
  sort: SortKey;
  sourcesOnly: boolean;
}

const SORT_KEYS: SortKey[] = ['stars', 'name', 'updated', 'forks'];
const DEFAULT_SORT: SortKey = 'stars';

export const EMPTY_STATE: DeckState = {
  username: '',
  search: '',
  language: null,
  topic: null,
  sort: DEFAULT_SORT,
  sourcesOnly: false,
};

function parse(search: string): DeckState {
  const params = new URLSearchParams(search);
  const sort = params.get('sort');
  return {
    username: params.get('u') ?? '',
    search: params.get('q') ?? '',
    language: params.get('lang'),
    topic: params.get('topic'),
    sort: SORT_KEYS.includes(sort as SortKey) ? (sort as SortKey) : DEFAULT_SORT,
    sourcesOnly: params.get('src') === '1',
  };
}

/** Only non-default values reach the URL, so a plain search stays a clean link. */
function serialize(state: DeckState): string {
  const params = new URLSearchParams();
  if (state.username) params.set('u', state.username);
  if (state.search) params.set('q', state.search);
  if (state.language) params.set('lang', state.language);
  if (state.topic) params.set('topic', state.topic);
  if (state.sort !== DEFAULT_SORT) params.set('sort', state.sort);
  if (state.sourcesOnly) params.set('src', '1');
  const query = params.toString();
  return query ? `?${query}` : window.location.pathname;
}

/**
 * Keeps the whole view — user, search, filter, sort — in the query string.
 *
 * Two things fall out of that for free: a view is shareable and survives a
 * refresh, and browser back/forward moves between users, which is what people
 * reflexively reach for. Looking up a new user pushes a history entry; changing
 * a filter only replaces the current one, so Back never has to be pressed
 * fifteen times to undo typing.
 */
export function useDeckState(): {
  state: DeckState;
  update: (patch: Partial<DeckState>) => void;
  setUsername: (username: string) => void;
} {
  const [state, setState] = useState<DeckState>(() => parse(window.location.search));
  const debounced = useDebouncedValue(state, 200);
  const lastUsername = useRef(state.username);

  useEffect(() => {
    const url = serialize(debounced);
    if (debounced.username !== lastUsername.current) {
      lastUsername.current = debounced.username;
      window.history.pushState(null, '', url);
    } else {
      window.history.replaceState(null, '', url);
    }
  }, [debounced]);

  useEffect(() => {
    const onPopState = () => {
      const next = parse(window.location.search);
      lastUsername.current = next.username;
      setState(next);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const update = useCallback((patch: Partial<DeckState>) => {
    setState((current) => ({ ...current, ...patch }));
  }, []);

  // A new user means a new set of languages, so carrying the old filters over
  // would usually land the viewer on an empty list for no visible reason.
  const setUsername = useCallback((username: string) => {
    setState((current) => ({ ...EMPTY_STATE, sort: current.sort, username }));
  }, []);

  return { state, update, setUsername };
}
