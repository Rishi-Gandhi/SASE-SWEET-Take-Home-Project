import { describe, expect, it } from 'vitest';
import { UNKNOWN_LANGUAGE_COLOR, languageColor } from '../lib/languages';

describe('languageColor', () => {
  it("uses GitHub's own colour for a known language", () => {
    expect(languageColor('TypeScript')).toBe('#3178c6');
    expect(languageColor('C')).toBe('#555555');
    expect(languageColor('Jupyter Notebook')).toBe('#da5b0b');
  });

  it('falls back to a neutral grey for anything else', () => {
    expect(languageColor('Brainfuck')).toBe(UNKNOWN_LANGUAGE_COLOR);
    expect(languageColor(null)).toBe(UNKNOWN_LANGUAGE_COLOR);
    expect(languageColor(undefined)).toBe(UNKNOWN_LANGUAGE_COLOR);
  });

  it('matches names exactly, the way the API returns them', () => {
    expect(languageColor('typescript')).toBe(UNKNOWN_LANGUAGE_COLOR);
  });
});
