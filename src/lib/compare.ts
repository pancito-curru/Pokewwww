import type { Pokemon } from '../data';

/** higher / lower = the target's value is higher / lower than the guess. */
export type CellResult = 'match' | 'partial' | 'miss' | 'higher' | 'lower';

export type ColumnKey =
  | 'type1' | 'type2' | 'generation' | 'color' | 'shape' | 'evoStage' | 'height' | 'weight' | 'category';

export interface Cell {
  key: ColumnKey;
  result: CellResult;
}

export const COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'type1', label: 'Type 1' },
  { key: 'type2', label: 'Type 2' },
  { key: 'generation', label: 'Gen' },
  { key: 'color', label: 'Color' },
  { key: 'shape', label: 'Shape' },
  { key: 'evoStage', label: 'Stage' },
  { key: 'height', label: 'Height' },
  { key: 'weight', label: 'Weight' },
  { key: 'category', label: 'Class' },
];

const eq = (a: unknown, b: unknown): CellResult => (a === b ? 'match' : 'miss');
const num = (guess: number, target: number): CellResult =>
  guess === target ? 'match' : target > guess ? 'higher' : 'lower';

function typeCell(slot: 0 | 1, g: Pokemon, t: Pokemon): CellResult {
  const gt = g.types[slot] ?? null;
  const tt = t.types[slot] ?? null;
  if (gt === tt) return 'match';
  // Right type, wrong slot (e.g. guessed Poison/Ground, target is Grass/Poison).
  if (gt && t.types.includes(gt)) return 'partial';
  return 'miss';
}

export function compare(g: Pokemon, t: Pokemon): Cell[] {
  const results: Record<ColumnKey, CellResult> = {
    type1: typeCell(0, g, t),
    type2: typeCell(1, g, t),
    generation: num(g.generation, t.generation),
    color: eq(g.color, t.color),
    shape: eq(g.shape, t.shape),
    evoStage: eq(g.evoStage, t.evoStage),
    height: num(g.height, t.height),
    weight: num(g.weight, t.weight),
    category: eq(g.category, t.category),
  };
  return COLUMNS.map(({ key }) => ({ key, result: results[key] }));
}

const EMOJI: Record<CellResult, string> = {
  match: '🟩',
  partial: '🟨',
  miss: '🟥',
  higher: '⬆️',
  lower: '⬇️',
};

/** Spoiler-free share text. `guesses` oldest first. */
export function shareText(opts: {
  title: string;
  guesses: Pokemon[];
  target: Pokemon;
  won: boolean;
  hintsUsed: number;
}): string {
  const { title, guesses, target, won, hintsUsed } = opts;
  const head = `${title} · ${won ? `${guesses.length} ${guesses.length === 1 ? 'guess' : 'guesses'}` : 'X'}${
    hintsUsed ? ` · ${hintsUsed} ${hintsUsed === 1 ? 'hint' : 'hints'}` : ''
  }`;
  const rows = guesses.map((g) => compare(g, target).map((c) => EMOJI[c.result]).join(''));
  return [head, ...rows].join('\n');
}
