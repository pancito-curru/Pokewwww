# Pokewwww — Pokémon Trivia Web App Blueprint

Four game modes, one shared data layer:

| Mode | Short name | Core loop |
|---|---|---|
| **Name 'Em All** | Timed recall | Type as many Pokémon names as you can before the timer runs out |
| **Who's That (Attribute Guess)** | Hint guesser | Guess a hidden Pokémon; each guess shows a row of ✅ / ❌ / ⬆⬇ for every attribute |
| **Pokédle** | Wordle | Pick a word length, then guess a hidden Pokémon name letter by letter |
| **Pokécross** | Crossword | Fill a generated crossword of Pokémon names; clues listed on the right |

---

## 1. Data sources

### PokeAPI (https://pokeapi.co, repo: https://github.com/PokeAPI)
REST API, no auth. Endpoints we need:

| Endpoint | Fields we use |
|---|---|
| `GET /api/v2/pokemon-species?limit=2000` | list of all species |
| `GET /api/v2/pokemon-species/{id}` | `generation`, `color`, `habitat`, `shape`, `is_legendary`, `is_mythical`, `is_baby`, `evolution_chain.url`, `names[]` (localized), `flavor_text_entries[]`, `egg_groups[]` |
| `GET /api/v2/pokemon/{id}` | `types[]`, `height` (decimetres), `weight` (hectograms), `stats[]`, `abilities[]` |
| `GET /api/v2/evolution-chain/{id}` | evolution stage (1/2/3) |
| `GET /api/v2/generation/{id}` | generation → main region name |

There is also a GraphQL endpoint (`https://beta.pokeapi.co/graphql/v1beta`) that can pull all of the above in a handful of queries instead of ~3,000 REST calls.

**PokeAPI's fair-use policy asks clients to cache data locally.** So the app should **never hit PokeAPI at runtime**. A build script fetches everything once and writes a static `pokedex.json`.

### PokéSprite (https://msikma.github.io/pokesprite/, repo: `msikma/pokesprite`)
Gen 8 box sprites (68×56 PNG, pixel art), regular and shiny, plus a `data/pokemon.json` that maps dex numbers to slugs and forms.

- Sprite URL pattern (served via jsDelivr's GitHub CDN):
  `https://cdn.jsdelivr.net/gh/msikma/pokesprite@master/pokemon-gen8/regular/{slug}.png`
  `https://cdn.jsdelivr.net/gh/msikma/pokesprite@master/pokemon-gen8/shiny/{slug}.png`
- The slug comes from `pokemon.json` (`slug.eng`), e.g. `mr-mime`, `farfetchd`, `nidoran-f`. **Don't derive it from the PokeAPI name.** Join on the dex number.
- Coverage is Gen 1–8 (#1–#898 plus some later forms). For Gen 9, fall back to PokeAPI's sprites (`sprites.front_default`) or leave Gen 9 out at first.
- Render with `image-rendering: pixelated` and scale ×2 or ×3.
- Silhouettes: CSS `filter: brightness(0)` on the same image. No extra assets needed.
- Pin a commit hash instead of `@master` for production, or copy the sprites into `/public`.

---

## 2. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Build | **Vite** | fast, static output |
| UI | **React 18 + TypeScript** | component-heavy UI, typed data |
| Styling | **Tailwind CSS** | quick theming, type colours as tokens |
| State | **Zustand** (+ `persist` middleware) | small; per-game stores; localStorage persistence |
| Routing | **React Router** | `/`, `/timed`, `/guess`, `/wordle`, `/crossword` |
| Tests | **Vitest** | name normalisation, wordle scoring, crossword generator |
| Hosting | GitHub Pages / Netlify / Vercel | fully static, no backend |

There is no backend. All game logic runs on the client. "Daily" puzzles come from a seeded RNG keyed on the date, so every player gets the same puzzle.

---

## 3. Project structure

```
pokewwww/
├─ scripts/
│  ├─ build-pokedex.ts        # fetch PokeAPI + pokesprite → src/data/pokedex.json
│  └─ cache/                  # raw API responses (gitignored), so re-runs are cheap
├─ src/
│  ├─ data/
│  │  ├─ pokedex.json         # generated, ~1025 entries, ~300 KB (gzip ~60 KB)
│  │  └─ index.ts             # typed loader + lookup maps (byId, byNormName, byLength)
│  ├─ lib/
│  │  ├─ normalize.ts         # name normalisation + alias matching
│  │  ├─ rng.ts               # seeded PRNG (mulberry32) + dailySeed()
│  │  ├─ compare.ts           # attribute comparison for the hint game
│  │  ├─ wordle.ts            # letter scoring (handles duplicate letters)
│  │  └─ crossword/
│  │     ├─ generator.ts      # grid placement algorithm
│  │     └─ clues.ts          # clue text generation
│  ├─ components/
│  │  ├─ Sprite.tsx           # <Sprite id silhouette? shiny? scale?>
│  │  ├─ TypeBadge.tsx
│  │  ├─ PokemonInput.tsx     # autocomplete input (shared by timed + hint games)
│  │  ├─ Timer.tsx
│  │  ├─ Keyboard.tsx         # on-screen keyboard (wordle)
│  │  ├─ ResultModal.tsx      # win/lose + share text
│  │  └─ FilterPanel.tsx      # generation / type filters shared by all modes
│  ├─ games/
│  │  ├─ timed/   (TimedGame.tsx, store.ts)
│  │  ├─ guess/   (GuessGame.tsx, GuessRow.tsx, store.ts)
│  │  ├─ wordle/  (WordleSetup.tsx, WordleGame.tsx, store.ts)
│  │  └─ crossword/ (CrosswordGame.tsx, Grid.tsx, ClueList.tsx, store.ts)
│  ├─ pages/Home.tsx          # mode picker
│  └─ App.tsx
└─ public/
```

---

## 4. Data model (`pokedex.json`)

```ts
type Region = 'Kanto'|'Johto'|'Hoenn'|'Sinnoh'|'Unova'|'Kalos'|'Alola'|'Galar'|'Paldea';
type PokeType = 'normal'|'fire'|'water'|'grass'|'electric'|'ice'|'fighting'|'poison'
  |'ground'|'flying'|'psychic'|'bug'|'rock'|'ghost'|'dragon'|'dark'|'steel'|'fairy';

interface Pokemon {
  id: number;              // national dex
  name: string;            // display name: "Mr. Mime", "Farfetch'd", "Nidoran♀"
  slug: string;            // pokesprite slug: "mr-mime"
  norm: string;            // normalised for matching: "mrmime"
  aliases: string[];       // extra accepted inputs: ["mr mime", "mister mime"]
  letters: string;         // A–Z only, uppercase, for wordle/crossword: "MRMIME"
  types: [PokeType] | [PokeType, PokeType];
  generation: number;      // 1–9
  region: Region;
  color: string;           // PokeAPI color: "red", "blue", ...
  habitat: string | null;  // PokeAPI habitat (null for Gen 4+; see note)
  shape: string;           // "quadruped", "upright", ...
  evoStage: 1 | 2 | 3;
  fullyEvolved: boolean;
  height: number;          // metres (PokeAPI dm / 10)
  weight: number;          // kg (PokeAPI hg / 10)
  bst: number;             // base stat total
  category: 'regular' | 'legendary' | 'mythical' | 'baby';
  eggGroups: string[];
  genus: string;           // "Seed Pokémon"
  flavor: string;          // one English dex entry with the name redacted to "_____"
}
```

> **Habitat gotcha:** PokeAPI only has `habitat` for Gen 1–3. Either drop it from the hint table, or show "—" and treat null = null as a match. **Shape** and **color** cover every generation and work better as attributes.

### Build script outline (`scripts/build-pokedex.ts`)
1. Fetch the species list. For each id, fetch `pokemon-species/{id}`, `pokemon/{id}` and its evolution chain (deduplicate chains). Cache every response to disk. Throttle to ~10 requests/s.
2. Fetch `pokesprite/data/pokemon.json` and map `dex number → slug.eng`.
3. Compute `evoStage` by walking the chain tree to find the species' depth.
4. Pick the English display name from `names[]` (language `en`), not the API slug. PokeAPI slugs look like `mr-mime`, while display names look like `Mr. Mime`.
5. Redact the name inside the flavour text (case-insensitive). Collapse `\n` and `\f`.
6. Write `src/data/pokedex.json` and fail the build if any entry is missing a slug or type.

---

## 5. Shared utilities

### Name normalisation (`normalize.ts`)
This is the part most likely to cause bugs. Every input path uses it.
```ts
export const normalize = (s: string) =>
  s.toLowerCase()
   .normalize('NFD').replace(/[̀-ͯ]/g, '')   // Flabébé → flabebe
   .replace(/♀/g, 'f').replace(/♂/g, 'm')              // Nidoran♀ → nidoranf
   .replace(/[^a-z0-9]/g, '');                         // Mr. Mime → mrmime, Type: Null → typenull
```
- Matching = `normalize(input)` in a `Map<norm, id>` that also holds every alias.
- Hand-maintained aliases: `nidoranfemale`, `nidoranmale`, `mistermime`, `farfetched`, `flabebe`, `porygonz`, `hooh`.
- `letters` for wordle/crossword = `normalize(name).replace(/[0-9]/g,'').toUpperCase()`. Porygon2 becomes `PORYGON`, which collides with Porygon, so **exclude names with digits** from the wordle and crossword pools.

### Seeded RNG (`rng.ts`)
`mulberry32(seed)` + `dailySeed(mode) = hash(YYYY-MM-DD + mode)`. Every mode supports **Daily** (seeded) and **Unlimited** (`Math.random` seed).

### Filters (all modes)
Generation multi-select (1–9) and an optional "fully evolved only" toggle. The filtered list becomes the **answer pool**. The full dex stays valid as **guesses**, so players aren't punished for guessing outside the filter (configurable).

---

## 6. Game modes

### 6.1 Name 'Em All (timed)

**Setup screen**
- Timer: 5 / 10 / 15 / 30 min, or untimed
- Scope: All, or chosen generations
- Option: show silhouettes vs. empty boxes

**Gameplay**
- One text input, always focused. A guess is accepted **as soon as** the normalised input matches an unguessed Pokémon in scope. No Enter key needed; the input clears and briefly flashes green.
- Below the input, a grid grouped by generation. Each cell is a numbered box (or silhouette) that turns into the coloured sprite and name when guessed.
- Header: `123 / 1025`, timer counting down, **Give up** button.
- Already-guessed name → small "already found" shake, no penalty.

**End state**
- When time's up or the player gives up, reveal the missed Pokémon in red/greyscale.
- Stats: total, % per generation, guesses per minute.
- Best score per scope/timer combo saved in localStorage.

**State**
```ts
{ scopeIds: number[]; found: Set<number>; startedAt: number; durationMs: number|null;
  status: 'setup'|'playing'|'ended' }
```

---

### 6.2 Who's That? (attribute hint game)

**Flow:** a random target is chosen from the pool. The player types a name in `PokemonInput`, which autocompletes with sprite thumbnails and leaves out names already guessed. Each guess adds a row to a table, **newest on top**.

**Columns and comparison rules**

| Column | Display | Result |
|---|---|---|
| Pokémon | sprite + name | — |
| Type 1 | badge | ✅ same · 🟨 matches target's *other* type · ❌ |
| Type 2 | badge / "None" | ✅ · 🟨 · ❌ |
| Generation / Region | "Gen 3 · Hoenn" | ✅ · ⬆ target is newer · ⬇ target is older |
| Color | swatch | ✅ / ❌ |
| Shape | icon | ✅ / ❌ |
| Evolution stage | 1 / 2 / 3 | ✅ / ❌ |
| Height | "1.7 m" | ✅ · ⬆ · ⬇ |
| Weight | "90.5 kg" | ✅ · ⬆ · ⬇ |
| Category | Regular / Legendary / Mythical / Baby | ✅ / ❌ |

- Cells are green for ✅, yellow for partial and red for ❌. An arrow overlay points toward the target value for numeric fields. Flip-in animation, staggered per column.
- `compare.ts` returns `{ key, value, result: 'match'|'partial'|'miss'|'higher'|'lower' }[]` so the UI stays dumb.

**Progressive hints** (optional buttons, unlocked after N guesses, each costs points)
- After 4 guesses: reveal the genus ("Seed Pokémon")
- After 7: reveal the redacted dex flavour text
- After 10: reveal a silhouette

**Win/lose**
- Unlimited guesses by default, or a hard mode with 8.
- Share string as an emoji grid:
  `Pokewwww #42 — 5 guesses\n🟥🟩🟥⬆🟩🟥⬇⬆🟩\n...`

---

### 6.3 Pokédle (wordle)

**Setup screen**
- Length picker: buttons for each length that has **at least ~15 valid names**, each showing its pool size (e.g. `5 letters · 120 Pokémon`). Lengths come from `byLength` in the pool after filtering, roughly 3 to 12 letters (Mew, Muk, Crabominable).
- Generation filter (shared component).
- Mode: Daily (one per length per day) / Unlimited.
- Toggle: **Strict guesses**. On, every guess must be a real Pokémon name of that length (classic wordle). Off, any letters are allowed.

**Gameplay**
- Grid: `length` columns × `length + 1` rows (minimum 6, maximum 8).
- On-screen keyboard plus physical keyboard; the keyboard colours keys by their best known state.
- Scoring (`wordle.ts`), with duplicate letters handled correctly:
  ```ts
  function score(guess: string, answer: string): ('correct'|'present'|'absent')[] {
    const res = Array(guess.length).fill('absent');
    const counts: Record<string, number> = {};
    for (let i = 0; i < answer.length; i++)
      if (guess[i] === answer[i]) res[i] = 'correct';
      else counts[answer[i]] = (counts[answer[i]] ?? 0) + 1;
    for (let i = 0; i < guess.length; i++)
      if (res[i] !== 'correct' && counts[guess[i]] > 0) { res[i] = 'present'; counts[guess[i]]--; }
    return res;
  }
  ```
- In strict mode an invalid guess shakes the row with "Not a Pokémon!".
- Optional hint button: show the target's type badges at the cost of one row.

**End:** reveal the sprite and name, plus stats per length (played, win %, streak, guess distribution).

---

### 6.4 Pokécross (crossword)

**Setup**
- Size: Small (≈8 words, 11×11), Medium (≈12, 13×13), Large (≈18, 15×15)
- Generation filter
- Clue difficulty: Easy (types + generation + silhouette) / Normal (genus + type) / Hard (flavour text only)

**Layout**
```
┌──────────────────────────────┬─────────────────────────┐
│                              │ ACROSS                  │
│        crossword grid        │ 1. Fire · Gen 1 · Lizard│
│     (click a cell; type)     │ 4. ...                  │
│                              │ DOWN                    │
│                              │ 2. Electric · Gen 1 ... │
│ [Check] [Reveal word] [Reset]│ 3. ...                  │
└──────────────────────────────┴─────────────────────────┘
```
On mobile the clue list moves below the grid. The active clue is pinned above the keyboard.

**Generator (`crossword/generator.ts`)**: greedy placement with retries.
1. Take candidates from the pool: `letters` length 4–10, no digits. Shuffle with the seeded RNG.
2. Place the longest word horizontally in the centre.
3. For each next word, list every position where it crosses an already-placed word on a shared letter, running perpendicular to it. A position is **valid** if:
   - it stays within bounds,
   - every overlapping cell is either empty or holds the same letter,
   - cells beside the word (parallel neighbours) are empty, except at crossings,
   - the cells just before and after the word are empty.
4. Score valid positions: more crossings is better, closer to the centre is better. Place the best one, or skip the word if none is valid.
5. Stop when the target word count is reached. Run ~30 attempts with different shuffles, keep the densest grid (most crossings ÷ area), then crop to its bounding box.
6. Number the cells in reading order: a cell gets a number if it starts an across or a down word.

Output:
```ts
interface Placement { id: number; pokemonId: number; answer: string;
  row: number; col: number; dir: 'across'|'down'; number: number; clue: string }
interface Crossword { width: number; height: number; cells: (string|null)[][]; placements: Placement[] }
```

**Clue builder (`clues.ts`)**: pull from the Pokémon's data and vary the template:
- `"Fire/Flying · Gen 1 · Flame Pokémon"`
- `"Evolves from Charmeleon"` (needs the previous evolution name in the data; add `evolvesFrom` to the schema)
- Hard: `"_____ breathes flames hot enough to melt boulders…"` (redacted flavour text)
- Easy mode adds a small silhouette sprite next to the clue.
- Always append the letter count: `(9)`.

**Interaction**
- Clicking a cell selects the word; clicking again toggles across/down. Arrow keys move, Backspace goes back, typing moves forward.
- Clicking a clue on the right focuses its first empty cell. The active clue and its cells are highlighted.
- When a word is complete and correct, the clue is struck through and a ✅ plus the small sprite appear next to it.
- **Check** marks wrong letters red. **Reveal word** fills it in and costs score. The puzzle counts as won when every cell is correct.

---

## 7. UI / UX notes
- **Home:** four cards (sprite collage, mode name, one-line description, Daily ✅ indicator if completed today).
- **Theme:** dark and light modes. Type colours as Tailwind tokens (`bg-type-fire` etc.). A pixel font such as "Press Start 2P" for headings only, so text stays readable.
- **Accessibility:** ✅/❌/arrows are always shown as icons as well as colour, a colour-blind palette toggle, full keyboard play in every mode.
- **Persistence (localStorage via Zustand persist):** stats per mode, in-progress daily state (so a refresh doesn't reset it), settings.
- **i18n-ready:** PokeAPI `names[]` includes Spanish, French, German, Japanese and more. Storing `names: Record<lang,string>` lets the game run in another language later. Wordle and crossword pools would then be built per language.

---

## 8. Milestones

| # | Deliverable | Status |
|---|---|---|
| 1 | Vite/React/TS scaffold, Tailwind, router, home page | ✅ |
| 2 | `build-pokedex.ts` → `pokedex.json`; `Sprite` component; normalisation + tests | ✅ |
| 3 | **Name 'Em All** (simplest; exercises data, sprites, input matching) | ✅ |
| 4 | **Who's That?** (`PokemonInput` autocomplete, `compare.ts`, guess table) | ✅ |
| 5 | **Pokédle** (length setup, scoring + tests, keyboard, stats) | ✅ |
| 6 | **Pokécross** (generator + tests, grid interaction, clue panel) | ✅ |
| 7 | Daily seeding, share strings, polish, deploy | ✅ Stats live in each mode's result screen and on the home cards instead of a separate modal |

## 9. Risks / gotchas
- **Name edge cases:** Mr. Mime, Mime Jr., Farfetch'd, Sirfetch'd, Nidoran♀/♂, Type: Null, Ho-Oh, Porygon-Z, Porygon2, Flabébé, Jangmo-o, Tapu Koko. Write unit tests for every one.
- **Forms:** use only the default form per species (`pokemon-species` → `varieties[is_default]`) so regional forms don't create duplicate answers.
- **Habitat** is missing after Gen 3 (see §4).
- **Sprite coverage:** PokéSprite stops at Gen 8, so Gen 9 needs a fallback.
- **Licensing:** Pokémon names and sprites are © Nintendo/Game Freak/The Pokémon Company. Keep the project non-commercial and say so in the footer. PokéSprite's sprite images belong to their respective owners; credit the repo.
