import { useEffect } from 'react';

/**
 * ⌘K (or Ctrl+K) opens the palette from anywhere; a bare "/" jumps to the
 * username field, but only when the viewer is not already typing into
 * something — otherwise "/" could never be typed into the filter box.
 */
export function useGlobalShortcuts({
  onOpenPalette,
  onFocusSearch,
}: {
  onOpenPalette: () => void;
  onFocusSearch: () => void;
}): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typingElsewhere =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        Boolean(target?.isContentEditable);

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpenPalette();
        return;
      }
      if (event.key === '/' && !typingElsewhere && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        onFocusSearch();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onOpenPalette, onFocusSearch]);
}
