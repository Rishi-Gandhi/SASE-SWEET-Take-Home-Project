/**
 * GitHub's own language colours, from github-linguist's languages.yml, so a
 * dot here means what it means on github.com.
 *
 * They are keyed by the language's NAME, never its rank. That is what makes
 * them stable: a language keeps its colour when the list is filtered, when a
 * comparison adds a second account, and from one account to the next — so
 * the old rank-based palette's "never repaint what the reader has learned"
 * rule now holds by construction rather than by care.
 *
 * The trade-off, owned: linguist colours were never designed as a set, and
 * some neighbours are close (HTML, Swift and C++ are all reds). So colour is
 * never the only cue — the language name is always printed beside its dot.
 */
const LINGUIST: Readonly<Record<string, string>> = {
  ActionScript: '#882b0f',
  Assembly: '#6e4c13',
  Astro: '#ff5a03',
  Batchfile: '#c1f12e',
  C: '#555555',
  'C#': '#178600',
  'C++': '#f34b7d',
  Clojure: '#db5855',
  CoffeeScript: '#244776',
  'Common Lisp': '#3fb68b',
  CSS: '#663399',
  Cuda: '#3a4e3a',
  D: '#ba595e',
  Dart: '#00b4ab',
  Dockerfile: '#384d54',
  Elixir: '#6e4a7e',
  Elm: '#60b5cc',
  'Emacs Lisp': '#c065db',
  Erlang: '#b83998',
  'F#': '#b845fc',
  Fortran: '#4d41b1',
  GDScript: '#355570',
  GDShader: '#478cbf',
  GLSL: '#5686a5',
  Go: '#00add8',
  Groovy: '#4298b8',
  Handlebars: '#f7931e',
  Haskell: '#5e5086',
  HCL: '#844fba',
  HTML: '#e34c26',
  Java: '#b07219',
  JavaScript: '#f1e05a',
  Julia: '#a270ba',
  'Jupyter Notebook': '#da5b0b',
  Kotlin: '#a97bff',
  Less: '#1d365d',
  Lua: '#000080',
  Makefile: '#427819',
  MATLAB: '#e16737',
  MDX: '#fcb32c',
  Nim: '#ffc200',
  Nix: '#7e7eff',
  'Objective-C': '#438eff',
  'Objective-C++': '#6866fb',
  OCaml: '#ef7a08',
  Pascal: '#e3f171',
  Perl: '#0298c3',
  PHP: '#4f5d95',
  PLpgSQL: '#336790',
  PowerShell: '#012456',
  Processing: '#0096d8',
  Python: '#3572a5',
  R: '#198ce7',
  Racket: '#3c5caa',
  Ruby: '#701516',
  Rust: '#dea584',
  Scala: '#c22d40',
  Scheme: '#1e4aec',
  SCSS: '#c6538c',
  Shell: '#89e051',
  Solidity: '#aa6746',
  Svelte: '#ff3e00',
  Swift: '#f05138',
  TeX: '#3d6117',
  TSQL: '#e38c00',
  TypeScript: '#3178c6',
  'Vim Script': '#199f4b',
  'Visual Basic .NET': '#945db7',
  Vue: '#41b883',
  Zig: '#ec915c',
};

/** For a language this table has no colour for, and for the "Other" fold. */
export const UNKNOWN_LANGUAGE_COLOR = '#8a8f98';

export function languageColor(language: string | null | undefined): string {
  return (language && LINGUIST[language]) || UNKNOWN_LANGUAGE_COLOR;
}
