import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { POKEDEX, getPool } from '../../data';
import { dailySeed, mulberry32, pick, randomSeed, todayKey } from '../../lib/rng';
import { emptyStats, recordResult, type PuzzleStats } from '../../lib/stats';

/**
 * Store for "one hidden Pokémon, a list of guesses" games with a daily round
 * (same for everyone) and an unlimited round (random, filtered by generation).
 */

export type PuzzleMode = 'daily' | 'unlimited';

export interface PuzzleRound<G> {
  mode: PuzzleMode;
  /** Date for daily rounds, seed for unlimited ones. */
  key: string;
  targetId: number;
  guesses: G[];
  generations: number[];
  status: 'playing' | 'won' | 'lost';
}

export interface PuzzleState<G> {
  mode: PuzzleMode;
  /** Unlimited only; empty = all. */
  generations: number[];
  daily: PuzzleRound<G> | null;
  unlimited: PuzzleRound<G> | null;
  stats: Record<PuzzleMode, PuzzleStats>;
  setMode: (mode: PuzzleMode, eligible?: (id: number) => boolean) => void;
  setGenerations: (generations: number[]) => void;
  /** Create today's daily / the first unlimited round if needed. */
  ensureRound: (eligible?: (id: number) => boolean) => void;
  newUnlimited: (eligible?: (id: number) => boolean) => void;
  /** Returns false when the guess was ignored (repeat, or round over). */
  guess: (g: G) => boolean;
  giveUp: () => void;
}

export interface PuzzleRules<G> {
  name: string;
  /** Apply a guess; null = ignore it. Return the updated round with its new status. */
  addGuess: (round: PuzzleRound<G>, guess: G) => PuzzleRound<G> | null;
  /** Stats bucket for a won round (guesses used, misses…). */
  bucket: (round: PuzzleRound<G>) => number;
}

export function createPuzzleStore<G>(rules: PuzzleRules<G>) {
  const makeRound = (mode: PuzzleMode, generations: number[], eligible?: (id: number) => boolean): PuzzleRound<G> => {
    const daily = mode === 'daily';
    const seed = daily ? dailySeed(rules.name) : randomSeed();
    const base = daily ? POKEDEX : getPool({ generations });
    const pool = eligible ? base.filter((p) => eligible(p.id)) : base;
    return {
      mode,
      key: daily ? todayKey() : String(seed),
      targetId: pick(pool.length ? pool : base, mulberry32(seed)).id,
      guesses: [],
      generations: daily ? [] : generations,
      status: 'playing',
    };
  };

  return create<PuzzleState<G>>()(
    persist(
      (set, get) => {
        const update = (fn: (r: PuzzleRound<G>) => PuzzleRound<G> | null): boolean => {
          const { mode, stats } = get();
          const round = get()[mode];
          if (!round || round.status !== 'playing') return false;
          const next = fn(round);
          if (!next) return false;
          const finished = next.status !== 'playing';
          set({
            [mode]: next,
            ...(finished && {
              stats: {
                ...stats,
                [mode]: recordResult(stats[mode], {
                  daily: mode === 'daily',
                  won: next.status === 'won',
                  bucket: rules.bucket(next),
                  date: mode === 'daily' ? next.key : undefined,
                }),
              },
            }),
          } as Partial<PuzzleState<G>>);
          return true;
        };

        return {
          mode: 'daily',
          generations: [],
          daily: null,
          unlimited: null,
          stats: { daily: emptyStats(), unlimited: emptyStats() },

          setMode: (mode, eligible) => {
            set({ mode });
            get().ensureRound(eligible);
          },
          setGenerations: (generations) => set({ generations }),

          ensureRound: (eligible) => {
            const { mode, daily, unlimited, generations } = get();
            if (mode === 'daily' && daily?.key !== todayKey()) set({ daily: makeRound('daily', [], eligible) });
            if (mode === 'unlimited' && !unlimited) set({ unlimited: makeRound('unlimited', generations, eligible) });
          },

          newUnlimited: (eligible) => {
            const { unlimited, stats } = get();
            // Abandoning a round you've guessed in counts as a loss.
            if (unlimited?.status === 'playing' && unlimited.guesses.length)
              set({
                stats: {
                  ...stats,
                  unlimited: recordResult(stats.unlimited, { daily: false, won: false, bucket: 0 }),
                },
              });
            set({ mode: 'unlimited', unlimited: makeRound('unlimited', get().generations, eligible) });
          },

          guess: (g) => update((r) => rules.addGuess(r, g)),
          giveUp: () => update((r) => ({ ...r, status: 'lost' })),
        };
      },
      { name: `pokewwww-${rules.name}`, version: 1 },
    ),
  );
}
