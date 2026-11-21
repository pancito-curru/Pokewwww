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

export interface MovesetData {
  moves: Record<string, MoveInfo>;
  /** Pokémon id → move slugs, ordered from common (vague) to rare (telling). */
  sets: Record<string, string[]>;
}

/** How many moves to show after `misses` wrong guesses (or all, once the round is over). */
export function movesShown(total: number, misses: number, over: boolean): number {
  return over ? total : Math.min(total, START_SHOWN + misses);
}

/** 🟥🟥🟩 style row for share text. */
export function guessRow(misses: number, won: boolean): string {
  return '🟥'.repeat(misses) + (won ? '🟩' : '');
}
