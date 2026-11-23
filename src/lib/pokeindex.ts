/** Rules for PokeIndex: name the Pokémon from its Pokédex number. */

/** Wrong guesses allowed. */
export const MAX_GUESSES = 6;
/** Misses after which each hint appears. The silhouette comes late on purpose: it nearly gives the answer away. */
export const HINT_GEN = 1;
export const HINT_TYPES = 2;
export const HINT_SILHOUETTE = 3;

export type HintKey = 'generation' | 'types' | 'silhouette';

/** Hints unlocked after `misses` wrong guesses, in the order they appear. */
export function hintsFor(misses: number): HintKey[] {
  const out: HintKey[] = [];
  if (misses >= HINT_GEN) out.push('generation');
  if (misses >= HINT_TYPES) out.push('types');
  if (misses >= HINT_SILHOUETTE) out.push('silhouette');
  return out;
}

/** "#025", "#1000". */
export const formatDex = (id: number) => `#${String(id).padStart(3, '0')}`;

/** Whether the target's number is above or below a wrong guess's number. */
export function direction(guessId: number, targetId: number): 'higher' | 'lower' | 'same' {
  return targetId > guessId ? 'higher' : targetId < guessId ? 'lower' : 'same';
}

/** 🟥🟥🟩 style row for share text. */
export const guessRow = (misses: number, won: boolean) => '🟥'.repeat(misses) + (won ? '🟩' : '');
