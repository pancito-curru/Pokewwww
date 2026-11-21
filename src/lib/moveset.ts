/** Rules for the Moveset game: guess the Pokémon from its moves. */

/** Moves visible before the first guess. */
export const START_SHOWN = 2;
/** Guesses allowed. Each miss reveals one more move. */
export const MAX_GUESSES = 5;

export interface MoveInfo {
  name: string;
  type: string;
  /** physical | special | status */
  cls: string;
}

/** Level a move is learned at (0 = on evolution), or the learn method (machine, tutor, egg…). */
export type Learn = number | string;

export interface Moveset {
  /** Version group the levels come from (see `games`), or null when it has no full level-up set. */
  vg: number | null;
  /** [move slug, how it's learned], ordered from common (vague) to rare (telling). */
  moves: [string, Learn][];
}

export interface MovesetData {
  moves: Record<string, MoveInfo>;
  /** Version group id → game names, e.g. "Scarlet & Violet". */
  games: Record<string, string>;
  sets: Record<string, Moveset>;
}

const METHOD_LABEL: Record<string, string> = { machine: 'TM', tutor: 'Tutor', egg: 'Egg', reminder: 'Reminder' };

/** Short label for how a move is learned: "Lv. 12", "Evolution", "TM"… */
export function learnLabel(l: Learn): string {
  if (typeof l === 'number') return l === 0 ? 'Evolution' : `Lv. ${l}`;
  return METHOD_LABEL[l] ?? l.charAt(0).toUpperCase() + l.slice(1).replace(/-/g, ' ');
}

/** How many moves to show after `misses` wrong guesses (or all, once the round is over). */
export function movesShown(total: number, misses: number, over: boolean): number {
  return over ? total : Math.min(total, START_SHOWN + misses);
}

/** 🟥🟥🟩 style row for share text. */
export function guessRow(misses: number, won: boolean): string {
  return '🟥'.repeat(misses) + (won ? '🟩' : '');
}
