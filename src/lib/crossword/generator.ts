import type { Pokemon } from '../../data';
import { isLetterSafe } from '../normalize';
import { mulberry32, shuffle } from '../rng';

export type Dir = 'across' | 'down';

export interface Placement {
  id: number;
  pokemonId: number;
  answer: string;
  row: number;
  col: number;
  dir: Dir;
  number: number;
  clue: string;
}

export interface Crossword {
  width: number;
  height: number;
  /** Solution letters; null = black square. */
  cells: (string | null)[][];
  placements: Placement[];
}

export interface GenerateOptions {
  words: number;
  maxSize: number;
  seed: number;
  attempts?: number;
  minLength?: number;
}

interface Cell {
  ch: string;
  across: boolean;
  down: boolean;
}

interface Placed {
  p: Pokemon;
  row: number;
  col: number;
  dir: Dir;
}

interface Bounds {
  minR: number;
  maxR: number;
  minC: number;
  maxC: number;
}

const key = (r: number, c: number) => `${r},${c}`;
const step = (dir: Dir) => (dir === 'down' ? [1, 0] : [0, 1]);

/** How many words to try per attempt; keeps generation fast. */
const CANDIDATES_PER_ATTEMPT = 140;

class Board {
  cells = new Map<string, Cell>();
  /** letter → cell coordinates holding it, for fast crossing lookup */
  byLetter = new Map<string, [number, number][]>();
  bounds: Bounds = { minR: 0, maxR: 0, minC: 0, maxC: 0 };
  placed: Placed[] = [];
  crossings = 0;

  /** Crossings the word would make, or -1 if it can't go there. */
  check(word: string, r: number, c: number, dir: Dir, maxSize: number): number {
    const [dr, dc] = step(dir);
    const len = word.length;
    if (this.cells.has(key(r - dr, c - dc)) || this.cells.has(key(r + dr * len, c + dc * len))) return -1;

    let crossings = 0;
    for (let i = 0; i < len; i++) {
      const rr = r + dr * i;
      const cc = c + dc * i;
      const cell = this.cells.get(key(rr, cc));
      if (cell) {
        if (cell.ch !== word[i] || cell[dir]) return -1;
        crossings++;
      } else if (this.cells.has(key(rr + dc, cc + dr)) || this.cells.has(key(rr - dc, cc - dr))) {
        // A new letter may not touch a parallel neighbour (it would form a non-word).
        return -1;
      }
    }

    if (this.placed.length) {
      const b = this.grown(r, c, dir, len);
      if (b.maxR - b.minR + 1 > maxSize || b.maxC - b.minC + 1 > maxSize) return -1;
    } else if (len > maxSize) return -1;
    return crossings;
  }

  grown(r: number, c: number, dir: Dir, len: number): Bounds {
    const [dr, dc] = step(dir);
    const b = this.bounds;
    return {
      minR: Math.min(b.minR, r),
      maxR: Math.max(b.maxR, r + dr * (len - 1)),
      minC: Math.min(b.minC, c),
      maxC: Math.max(b.maxC, c + dc * (len - 1)),
    };
  }

  place(p: Pokemon, r: number, c: number, dir: Dir, crossings: number) {
    const [dr, dc] = step(dir);
    const word = p.letters;
    this.bounds = this.placed.length ? this.grown(r, c, dir, word.length) : {
      minR: r, maxR: r + dr * (word.length - 1), minC: c, maxC: c + dc * (word.length - 1),
    };
    for (let i = 0; i < word.length; i++) {
      const rr = r + dr * i;
      const cc = c + dc * i;
      const k = key(rr, cc);
      const cell = this.cells.get(k);
      if (cell) cell[dir] = true;
      else {
        this.cells.set(k, { ch: word[i], across: dir === 'across', down: dir === 'down' });
        const list = this.byLetter.get(word[i]) ?? [];
        list.push([rr, cc]);
        this.byLetter.set(word[i], list);
      }
    }
    this.placed.push({ p, row: r, col: c, dir });
    this.crossings += crossings;
  }

  /** Best crossing position for a word, or null. */
  bestSpot(word: string, maxSize: number): { r: number; c: number; dir: Dir; crossings: number } | null {
    let best: { r: number; c: number; dir: Dir; crossings: number; score: number } | null = null;
    for (let i = 0; i < word.length; i++) {
      for (const [cr, cc] of this.byLetter.get(word[i]) ?? []) {
        const cell = this.cells.get(key(cr, cc))!;
        for (const dir of ['across', 'down'] as Dir[]) {
          if (cell[dir]) continue;
          const [dr, dc] = step(dir);
          const r = cr - dr * i;
          const c = cc - dc * i;
          const crossings = this.check(word, r, c, dir, maxSize);
          if (crossings < 1) continue;
          const b = this.grown(r, c, dir, word.length);
          const w = b.maxC - b.minC + 1;
          const h = b.maxR - b.minR + 1;
          // Favour more crossings, then a compact, squarish grid.
          const score = crossings * 60 - w * h - Math.abs(w - h) * 4;
          if (!best || score > best.score) best = { r, c, dir, crossings, score };
        }
      }
    }
    return best;
  }
}

function attempt(cands: Pokemon[], seed: number, words: number, maxSize: number): Board {
  const rand = mulberry32(seed);
  const order = shuffle(cands, rand).slice(0, CANDIDATES_PER_ATTEMPT);
  const board = new Board();
  const first = order.find((p) => p.letters.length >= Math.min(7, maxSize - 2)) ?? order[0];
  board.place(first, 0, 0, rand() < 0.5 ? 'across' : 'down', 0);

  const used = new Set([first.id]);
  const answers = new Set([first.letters]);
  let progress = true;
  while (board.placed.length < words && progress) {
    progress = false;
    for (const p of order) {
      if (used.has(p.id) || answers.has(p.letters)) continue;
      const spot = board.bestSpot(p.letters, maxSize);
      if (!spot) continue;
      board.place(p, spot.r, spot.c, spot.dir, spot.crossings);
      used.add(p.id);
      answers.add(p.letters);
      progress = true;
      if (board.placed.length >= words) break;
    }
  }
  return board;
}

const quality = (b: Board) => {
  const area = (b.bounds.maxR - b.bounds.minR + 1) * (b.bounds.maxC - b.bounds.minC + 1);
  return b.placed.length * 1000 + (b.crossings / area) * 100;
};

/** Pokémon that can appear in a crossword of this size. */
export function crosswordCandidates(pool: Pokemon[], maxSize: number, minLength = 4): Pokemon[] {
  const maxLen = Math.min(10, maxSize);
  return pool.filter((p) => isLetterSafe(p.name) && p.letters.length >= minLength && p.letters.length <= maxLen);
}

/** Generate a crossword. Clues are left empty; fill them with `buildClues`. */
export function generateCrossword(pool: Pokemon[], opts: GenerateOptions): Crossword {
  const { words, maxSize, seed, attempts = 24, minLength = 4 } = opts;
  const cands = crosswordCandidates(pool, maxSize, minLength);
  if (cands.length < 2) throw new Error('Not enough Pokémon for a crossword');

  const seeds = mulberry32(seed);
  let best: Board | null = null;
  for (let a = 0; a < attempts; a++) {
    const b = attempt(cands, Math.floor(seeds() * 2 ** 32), words, maxSize);
    if (!best || quality(b) > quality(best)) best = b;
    if (best.placed.length >= words && a >= attempts / 2) break;
  }
  return finalize(best!);
}

function finalize(board: Board): Crossword {
  const { minR, maxR, minC, maxC } = board.bounds;
  const height = maxR - minR + 1;
  const width = maxC - minC + 1;
  const cells: (string | null)[][] = Array.from({ length: height }, () => Array(width).fill(null));
  for (const [k, cell] of board.cells) {
    const [r, c] = k.split(',').map(Number);
    cells[r - minR][c - minC] = cell.ch;
  }

  const placed = board.placed.map((pl) => ({ ...pl, row: pl.row - minR, col: pl.col - minC }));
  const starts = new Map<string, number>();
  let n = 0;
  for (let r = 0; r < height; r++)
    for (let c = 0; c < width; c++)
      if (placed.some((pl) => pl.row === r && pl.col === c)) starts.set(key(r, c), ++n);

  const placements: Placement[] = placed
    .map((pl) => ({
      id: 0,
      pokemonId: pl.p.id,
      answer: pl.p.letters,
      row: pl.row,
      col: pl.col,
      dir: pl.dir,
      number: starts.get(key(pl.row, pl.col))!,
      clue: '',
    }))
    .sort((a, b) => (a.dir === b.dir ? a.number - b.number : a.dir === 'across' ? -1 : 1))
    .map((pl, i) => ({ ...pl, id: i }));

  return { width, height, cells, placements };
}

/** Cells covered by a placement, in order. */
export function placementCells(pl: Pick<Placement, 'row' | 'col' | 'dir' | 'answer'>): [number, number][] {
  const [dr, dc] = step(pl.dir);
  return Array.from({ length: pl.answer.length }, (_, i) => [pl.row + dr * i, pl.col + dc * i]);
}
