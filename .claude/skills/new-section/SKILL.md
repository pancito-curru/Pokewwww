---
name: new-section
description: Create a new game/section for the Pokewwwww Pokémon trivia site end to end. Analyzes the idea and the data it needs, designs rules and UI reusing the existing engines and components, builds it with tests, validates it in the browser, and documents it. Use whenever the user asks for a new game, mode, section or page (e.g. "add a guess-the-ability game", "make a quiz from Pokédex entries"), or a major rework of an existing one.
---

# New section for Pokewwwww

Build a new section (usually a game) that fits the existing app: same engines, components,
conventions and quality bar. Read `ARCHITECTURE.md` first; it is the source of truth for
structure, conventions and decisions. Follow the five phases in order and keep the task list
updated as you go.

## Phase 1: Analyze

Goal: know exactly what to build and whether the data supports it before writing code.

1. **Restate the idea** in one or two lines: what the player sees, what they answer, how a round
   ends. If the user's request leaves a real product decision open (number of tries, modes,
   timer lengths), choose a sensible default that matches the existing games and say so. Only ask
   when the choice would change the build substantially.
2. **List the modes.** The defaults in this project:
   - *Pokémon of the day* (same for everyone, seeded by date) + *Unlimited* (random, generation
     filter): for "one hidden Pokémon, several guesses" games.
   - *Daily* + *timed run* (regions + 1/2/3/5 min, auto-advance): for "identify from a clue" games.
3. **Check the data.**
   - Already in `pokedex.json` (`src/data/types.ts`)? Use it directly.
   - Derivable by URL from the dex number (artwork, cries, sprites in `src/data/sprites.ts`)?
     Add a URL helper there; verify with `curl -I` on a few ids, including Gen 9 (906–1025).
   - Needs more PokeAPI data? Inspect the cached responses first (`scripts/cache/*.json`, e.g. the
     `/pokemon/{id}` and `/pokemon-species/{id}` payloads) with a quick `node -e` script: coverage
     across all 1025, odd cases, size. Never call PokeAPI from the app at runtime.
4. **Find edge cases** that affect rules: names with punctuation or digits (Mr. Mime, Porygon2,
   Nidoran♀, Flabébé, Type: Null), Pokémon with missing or degenerate data (Ditto, Smeargle, Unown,
   Cosmog), Gen 9 without PokéSprite sprites, anything that would give the answer away.

Output of this phase: a short plan (rules, modes, data source, exclusions) and the task list.

## Phase 2: Design

Pick the smallest design that reuses what exists.

**Choose the engine**

| The game is… | Reuse |
|---|---|
| One hidden Pokémon, a list of guesses, daily + unlimited | `createPuzzleStore` (`src/games/puzzle/`) with `{ name, addGuess, bucket }`, plus `Chrome.tsx` (`PuzzleHeader`, `UnlimitedOptions`, `GiveUp`, `PuzzleResult`, `WrongGuesses`). Examples: Moveset, Hangman |
| Identify a Pokémon from a clue, daily (3 tries) + timed run | `games/identify/`: add a `kind` to `kinds.ts`, a branch in `Prompt.tsx`, a store in `identifyStores`, a page wrapper. Examples: Silhouettes, Cries |
| Something structurally different (grid, timer over the whole dex…) | A dedicated store in `src/games/<name>/store.ts` (see `timed`, `wordle`, `crossword`) |

**Design the pieces**
- **Pure rules** in `src/lib/<name>.ts`: constants (`MAX_…`), judging a guess, deriving what to
  show, share text. No React, no store.
- **Data**: if new generated data is needed, write `scripts/build-<name>.ts` using
  `scripts/fetch-cache.ts` (`getJson`, `pool`, `en`, `idFromUrl`), output `src/data/<name>.json`,
  add an npm script `data:<name>`, and load the JSON with a dynamic `import()` inside the game so
  it gets its own chunk. If the data must stay out of the home bundle, keep store modules free of
  that import (pass an `eligible` filter in, as Moveset does).
- **UI**: reuse `PokemonInput` (set `showSprites={false}` if a sprite would reveal the answer),
  `Keyboard`, `Timer`, `FilterPanel`, `ShareButton`, `Switch`, `TypeBadge`, `Sprite`. Main card
  centered, max width ~`max-w-xl`/`max-w-2xl`, works at 375 px.
- **Fairness**: anything that hints at the answer (sprites, game names, ids in URLs visible on the
  page) is hidden until the round ends.
- **Persistence**: store key `pokewwww-<name>` (lowercase, with `version: 1`). Never rename an
  existing key.

## Phase 3: Develop

Implement in this order so every step can be checked:

1. `src/lib/<name>.ts` + `src/lib/<name>.test.ts`: rules first, with tests for the edge cases from
   Phase 1 (hand-check expected values; no circular assertions).
2. Data script and JSON, if any. Run it, then spot-check a handful of well-known Pokémon and print
   coverage and file size.
3. Store (engine config or dedicated store) + store tests: win, loss, repeats ignored, daily is
   stable per day, unlimited respects filters, abandoning counts as a loss where relevant. For
   randomness in tests, make assertions hold for every possible random outcome.
4. Screen component(s) in `src/games/<name>/`.
5. Register the section (all four, or it won't show up properly):
   - `src/games/modes.ts`: `path`, `title`, `blurb`, `sprites` (**exactly 3** dex numbers that fit
     the theme; they appear centered on the home card).
   - `src/App.tsx`: `lazy(() => import(...))` + `<Route path="..." element={<Suspense ...>} />`.
   - `src/pages/Home.tsx`: a status line in `STATUS` (today's daily state, streak or best).
   - Share text starts with `Pokewwwww <Title>` and never names the answer.
6. UI copy in English, brand **Pokewwwww**. Dark mode classes (`dark:`) on everything new.

Conventions to keep (details in `ARCHITECTURE.md` §8): strict TypeScript, no `any` in `src/`, logic
in `lib/`, comments only for the why, results shown with icons as well as color, controls with
accessible names.

## Phase 4: Validate

All of these, in order. Report failures honestly; fix the cause rather than the symptom.

1. `npx tsc -b`, then `npm test` (all files, not just the new ones), then `npm run build`. Check the
   build output: the new game has its own chunk and the main `index` chunk didn't grow
   unexpectedly. If a test fails intermittently, find the source of randomness and fix the test.
2. **Browser** (dev server from `.claude/launch.json`, name `dev`, http://localhost:5173):
   - Before playing, check `localStorage` for the user's own `pokewwww-*` progress and don't
     overwrite it; afterwards remove only the keys your test created.
   - Play the full flow: a wrong guess, a correct guess, a loss or give-up, the result card, share
     text (stub `navigator.clipboard` or check the generated text), unlimited mode with a filter,
     and reload mid-round to confirm it resumes.
   - Use real key presses (`key` action) for keyboard-driven games; the `type` action may not fire
     keydown events.
   - Check the home card (3 centered sprites, status line), nav link and page title.
   - Resize to 375 px (no horizontal scroll), check dark mode, and read the console for errors.
   - Screenshots can lag a frame; confirm state with JavaScript/DOM reads when they disagree.
3. Audio, clipboard or other browser APIs: handle failure states in the UI and test them.

## Phase 5: Document and ship

1. `ARCHITECTURE.md`: add the row in §6 (route, code, store key, modes); new reusable pieces in §7;
   any non-obvious choice in §9 with its reason; new limitations in §11; update the stack table if
   a dependency changed.
2. `README.md`: add the row to the modes table; document any new `npm run data:*` script.
3. Summarize for the user: what the section does (rules, modes, hints), decisions you made for
   them, what you verified and what you could not (e.g. a device or browser you didn't test).
4. **Ask before committing and pushing.** On approval: commit with an imperative English message
   plus the `Co-Authored-By` line, push to `main`, watch the deploy
   (`gh run watch <id> --repo pancito-curru/Pokewwwww --exit-status`), then open
   https://pancito-curru.github.io/Pokewwwww/#/<route> and confirm it loads without console errors.
