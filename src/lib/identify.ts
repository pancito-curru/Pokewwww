/**
 * Shared rules for the "identify one Pokémon at a time" games (silhouettes, cries).
 */

/** Guesses allowed per Pokémon, in the daily and in runs. */
export const MAX_ATTEMPTS = 3;

/** Run lengths in minutes. */
export const RUN_DURATIONS = [1, 2, 3, 5] as const;

export type ItemResult = 'correct' | 'missed' | 'skipped';

export interface RunItem {
  id: number;
  /** Wrong guesses so far, oldest first. */
  wrong: number[];
  result: ItemResult | null;
}

/** Outcome of one guess at the current item. */
export type GuessOutcome = 'correct' | 'wrong' | 'missed' | 'repeat';

export function judge(item: RunItem, guessId: number): { outcome: GuessOutcome; item: RunItem } {
  if (item.result) return { outcome: 'repeat', item };
  if (guessId === item.id) return { outcome: 'correct', item: { ...item, result: 'correct' } };
  if (item.wrong.includes(guessId)) return { outcome: 'repeat', item };
  const wrong = [...item.wrong, guessId];
  return wrong.length >= MAX_ATTEMPTS
    ? { outcome: 'missed', item: { ...item, wrong, result: 'missed' } }
    : { outcome: 'wrong', item: { ...item, wrong } };
}

export interface RunSummary {
  correct: number;
  missed: number;
  skipped: number;
  /** Correct answers on the first try. */
  firstTry: number;
}

export function summarize(items: RunItem[]): RunSummary {
  const done = items.filter((i) => i.result);
  return {
    correct: done.filter((i) => i.result === 'correct').length,
    missed: done.filter((i) => i.result === 'missed').length,
    skipped: done.filter((i) => i.result === 'skipped').length,
    firstTry: done.filter((i) => i.result === 'correct' && i.wrong.length === 0).length,
  };
}

/** Best-score key for a run: one record per generation set + length. */
export function runKey(generations: readonly number[], minutes: number): string {
  const gens = generations.length ? [...generations].sort((a, b) => a - b).join(',') : 'all';
  return `${gens}|${minutes}`;
}

/** ✅ / ❌ per guess for share text, e.g. "❌✅". */
export function attemptEmoji(wrong: number, solved: boolean): string {
  return '❌'.repeat(wrong) + (solved ? '✅' : '');
}
