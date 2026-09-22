# Repo Deck

A GitHub repository explorer. Enter a username, get their public repos — sortable, filterable,
and weighed by the languages they actually build in.

**Live demo: https://rishi-gandhi.github.io/SASE-SWEET-Take-Home-Project/**

![Repo Deck showing a user profile, language mix bar, and repository grid](docs/hero.png)

---

## Running it

```bash
npm install
npm run dev          # http://localhost:5173
```

Other scripts:

```bash
npm run build        # production bundle into dist/
npm run preview      # serve the built bundle
npm test             # 43 unit + integration tests
npm run typecheck    # tsc, no emit
```

No API key, no `.env`, no backend. It talks straight to the public GitHub REST API.

**Stack:** React 19 + TypeScript + Vite, Tailwind CSS v4, Vitest + Testing Library.
No component library — see [Why no component library](#why-no-component-library).

---

## What it does

- Look up any GitHub user and browse their public repositories
- Sort by stars, recency, name, or forks
- Filter by free text (matches name, description, **and** topics), by language, or by "hide forks"
- A **language mix** bar summarising what the account is actually built in — click a segment to filter
- Loading, empty, no-match, and four distinct error states
- Light/dark themes, keyboard shortcuts (`⌘K` / `/`), and a layout that works from 320px up
- Every view is a shareable URL

---

## Design decisions

### No auth token, and an honest rate-limit state

The app calls GitHub unauthenticated: **60 requests/hour, per IP**. Shipping a token in a public
client-side app would leak it, and proxying through a backend was out of scope for the exercise.

So instead of hiding the limit, the app handles it properly. GitHub answers an exhausted quota with
`403`, which is the same status it uses for genuinely forbidden requests — the header
`x-ratelimit-remaining: 0` is what actually distinguishes the two. When the app sees that, it reads
`x-ratelimit-reset` and tells you when the quota refills, rather than showing a generic failure.

Three things keep the app under the limit in normal use:

- **Client-side filtering.** All of a user's repos are fetched once, then every search, sort, and
  filter runs in memory. Typing in the filter box costs zero requests. GitHub's search endpoint
  would have been the alternative, and it is both slower and capped at 10 requests/minute anonymous.
- **An in-memory profile cache.** Revisiting a user (including via browser Back) costs nothing.
- **Local username validation.** A username that GitHub's own rules would reject never leaves the
  browser — a guaranteed-404 round trip becomes an instant message.

### Pagination has a deliberate ceiling

`/users/:login/repos` returns 100 per page. The app follows pages until a short page comes back, but
stops at **5 pages / 500 repos**. An uncapped loop over a 3,000-repo org would burn the entire hourly
budget on a single search. When it does stop early it fetches sorted by `updated`, so the repos it
drops are the least recently touched, and it says so in the UI rather than silently showing a partial
list.

### Cancelling in-flight requests

Searching a new user aborts the previous request via `AbortController`. Without it, a slow response
for `tor` can land *after* a fast one for `torvalds` and overwrite it — the classic async race in
search UIs. Aborts are re-thrown untouched so the error handler can tell "cancelled" from "failed".

### The URL is the state

User, search text, language, sort, and the fork toggle all live in the query string:

```
?u=simonw&q=cli&lang=Python&sort=updated
```

A view is shareable and survives a refresh. Looking up a new user **pushes** a history entry, so
browser Back moves between users; changing a filter only **replaces** it, so Back isn't fifteen
presses of undoing your own typing. Using the query string rather than path segments also means it
works on GitHub Pages with no SPA redirect hack.

### The language mix: a bar, three colours, and why

This is the one piece of real data visualisation in the app, and the choices behind it are
deliberate:

**Why a bar and not a donut.** It's a part-to-whole comparison. Rings are genuinely hard to compare
segments in — the human eye is bad at angles and worse at arc lengths — and language names are long
enough that a horizontal bar labels far more cleanly.

**Why exactly three named colours, then "Other".** The palette is validated for colour-vision
deficiency. Colours are only safe to use together if every *pair* stays distinguishable, and the
three hues used here (orange / aqua / violet) are the largest set that clears that gate in both light
and dark mode — the numbers are in the comments at the top of [`src/styles.css`](src/styles.css).
Adding a fourth named segment would put two colours on screen that some viewers cannot tell apart.
So the tail folds into a neutral grey instead of inventing another hue.

Blue is deliberately *excluded* from that set so it can stay the single accent and magnitude colour
without ever being mistaken for a language.

**Colour never carries meaning alone.** Every segment is named in the legend with its share, each is
a real `<button>` with a descriptive label, and there's a 2px gap between segments rather than a
border.

**One caveat I'll own:** segment colours are assigned by rank, which is normally an anti-pattern —
re-colouring a chart when you filter it misleads anyone who already learned "orange = Python". It's
safe here only because the spectrum is always computed from the **unfiltered** repo set. It's a fixed
portrait of the account; filtering the list below never repaints it.

### The star bar

Each card has a thin bar along its bottom edge showing that repo's stars against the largest repo
currently on screen. The scale is **linear on purpose** — when one repo has 200k stars and the rest
have 40, that gap *is* the story, and a log scale would quietly flatten it. There's a 3px floor so a
repo with stars never renders as literally nothing, and the exact count always sits in the card as
text.

It started directly under the repo title, where on low-star cards it read as a broken underline. The
bottom edge, with a visible track, reads as a deliberate gauge.

### Four error states, not one

"Something went wrong" is useless — a typo'd username, an exhausted quota, and a dropped connection
need three different actions from the person reading it. The API layer classifies failures into
`not-found | rate-limit | network | invalid-username | unknown`, and the UI writes real copy for each,
including whether a retry button even makes sense (it doesn't for a 404).

Empty is split too: **"this account has no public repos"** and **"your filters matched nothing"** are
different problems, and only the second one gets a "clear filters" button.

### Why no component library

The brief said component libraries were fine, but the same brief said the evaluation is about
technical decisions I can explain. Pulling in Mantine or shadcn would have meant a chunk of the UI
was code I hadn't written. The interactive pieces here are small enough to own: the dropdowns are
**native `<select>`**, which is keyboard- and screen-reader-correct for free and opens the platform
picker on a phone — better than any custom dropdown I'd write in the time available.

Tailwind v4 does the layout and the design tokens. Every colour is a CSS custom property defined once
and swapped for dark mode in one place, which is what makes the theme toggle a single attribute on
`<html>`.

### Accessibility

Not an afterthought, and cheap when done as you go: a skip link, one consistent focus-visible
treatment, `aria-pressed` on every toggle, a polite live region announcing the result count, labelled
controls throughout, `prefers-reduced-motion` honoured, and a theme applied before first paint so
light-mode users never get flashed.

Repo cards use a stretched-link pattern — the whole card is clickable, but the accessibility tree
sees exactly one link, with the language chip lifted above it so it stays independently clickable.

---

## Architecture

```
src/
  lib/
    github.ts      API client, pagination, error taxonomy
    repos.ts       filter + sort (pure)
    spectrum.ts    language distribution (pure)
    format.ts      numbers, relative dates (Intl)
  hooks/
    useProfile.ts     fetch state machine, abort, cache
    useDeckState.ts   URL <-> state sync
    useTheme.ts       theme persistence
  components/       presentational; no fetching
  test/
```

The split that matters: **anything with interesting logic is a pure function in `lib/`.** Sorting,
filtering, and the language breakdown take data in and return data out, so they're testable without
rendering anything. Components receive props and render. Hooks own the messy parts — network, URL,
storage.

State is `useState` + `useMemo`. No Redux, no React Query, no router. The app has one async
resource and five filter values; reaching for a state library here would be more code to explain, not
less.

## Tests

43 tests, run with `npm test`:

- **`repos.test.ts`** — every sort key, tie-breaking, search across name/description/topics, filter
  combinations, and that sorting doesn't mutate its input
- **`spectrum.test.ts`** — ranking, the three-colour cap, the "Other" fold, deterministic tie-breaks,
  shares summing to 1
- **`github.test.ts`** — username validation, and that each failure maps to the right error kind:
  404, rate-limit-with-reset-time, a plain 403 that is *not* a rate limit, network failure, and an
  abort passing through untouched
- **`App.test.tsx`** — the real flows against a stubbed API: search → render, filter → count, empty
  filters → recovery, clicking a language segment, URL round-tripping, and each error state

## Trade-offs, and what I'd do next

- **The 500-repo ceiling.** Fine for people, visible for large orgs. Real fix is infinite scroll with
  windowing, which is more machinery than this exercise warranted.
- **Total stars is a lower bound** for accounts past the ceiling, since it sums only what was loaded.
- **Star-bar scale is per-view.** Filtering to a handful of small repos rescales the bars. That's how
  axes normally behave, but it does mean the bar isn't comparable across two different filters.
- **With more time:** a tiny serverless proxy holding a token (5,000 requests/hour instead of 60),
  the repo list virtualised, and a language breakdown weighted by *bytes* via `/repos/:owner/:repo/languages`
  rather than by primary-language repo count — more accurate, but one extra request per repo, which
  the anonymous rate limit rules out entirely.

---

Built with the [GitHub REST API](https://docs.github.com/en/rest/repos/repos).
