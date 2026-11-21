import { todayKey } from './rng';

/** Stats for a daily/unlimited puzzle mode. */
export interface PuzzleStats {
  played: number;
  wins: number;
  streak: number;
  maxStreak: number;
  /** wins by bucket (guesses used, misses…): { 3: 2, 5: 1 } */
  distribution: Record<number, number>;
  /** Date of the last finished daily (daily stats only). */
  lastDaily?: string;
}

export const emptyStats = (): PuzzleStats => ({ played: 0, wins: 0, streak: 0, maxStreak: 0, distribution: {} });

/**
 * Add one finished round. Daily streaks only continue from yesterday's daily;
 * unlimited streaks count consecutive wins.
 */
export function recordResult(
  stats: PuzzleStats,
  r: { daily: boolean; won: boolean; bucket: number; date?: string },
): PuzzleStats {
  const today = r.date ?? todayKey();
  const yesterday = todayKey(new Date(new Date(`${today}T12:00:00`).getTime() - 86_400_000));
  const continues = !r.daily || stats.lastDaily === yesterday;
  const streak = r.won ? (continues ? stats.streak + 1 : 1) : 0;
  return {
    played: stats.played + 1,
    wins: stats.wins + (r.won ? 1 : 0),
    streak,
    maxStreak: Math.max(stats.maxStreak, streak),
    distribution: r.won ? { ...stats.distribution, [r.bucket]: (stats.distribution[r.bucket] ?? 0) + 1 } : stats.distribution,
    lastDaily: r.daily ? today : stats.lastDaily,
  };
}
