import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MAX_GUESSES, pickItem } from '../../lib/items';
import { dailySeed, randomSeed, todayKey } from '../../lib/rng';
import { emptyStats, recordResult, type PuzzleStats } from '../../lib/stats';

export type ItemMode = 'daily' | 'unlimited';

/** Rounds are kept as plain data: the item's id and the ids guessed. */
export interface ItemRound {
  mode: ItemMode;
  /** Date for daily rounds, seed for unlimited ones. */
  key: string;
  targetId: number;
  guesses: number[];
  /** Unlimited only; empty = every pocket. */
  pockets: string[];
  status: 'playing' | 'won' | 'lost';
}

interface ItemState {
  mode: ItemMode;
  /** Pockets the next unlimited item comes from; empty = all. */
  pockets: string[];
  daily: ItemRound | null;
  unlimited: ItemRound | null;
  stats: Record<ItemMode, PuzzleStats>;
  setMode: (mode: ItemMode) => void;
  setPockets: (pockets: string[]) => void;
  /** Create today's daily / the first unlimited round if needed. `pool` = item ids the current mode may pick from. */
  ensureRound: (pool: number[]) => void;
  newUnlimited: (pool: number[]) => void;
  /** Returns false when the guess was ignored (repeat, or round over). */
  guess: (id: number) => boolean;
  giveUp: () => void;
}

const makeRound = (mode: ItemMode, pool: number[], pockets: string[]): ItemRound => {
  const daily = mode === 'daily';
  const seed = daily ? dailySeed('item') : randomSeed();
  return {
    mode,
    key: daily ? todayKey() : String(seed),
    targetId: pickItem(pool, seed),
    guesses: [],
    pockets: daily ? [] : pockets,
    status: 'playing',
  };
};

export const useItemStore = create<ItemState>()(
  persist(
    (set, get) => {
      const update = (fn: (r: ItemRound) => ItemRound | null): boolean => {
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
                bucket: next.guesses.length,
                date: mode === 'daily' ? next.key : undefined,
              }),
            },
          }),
        } as Partial<ItemState>);
        return true;
      };

      return {
        mode: 'daily',
        pockets: [],
        daily: null,
        unlimited: null,
        stats: { daily: emptyStats(), unlimited: emptyStats() },

        setMode: (mode) => set({ mode }),
        setPockets: (pockets) => set({ pockets }),

        ensureRound: (pool) => {
          const { mode, daily, unlimited, pockets } = get();
          if (!pool.length) return;
          if (mode === 'daily' && daily?.key !== todayKey()) set({ daily: makeRound('daily', pool, []) });
          if (mode === 'unlimited' && !unlimited) set({ unlimited: makeRound('unlimited', pool, pockets) });
        },

        newUnlimited: (pool) => {
          const { unlimited, stats, pockets } = get();
          if (!pool.length) return;
          // Abandoning a round you've guessed in counts as a loss.
          if (unlimited?.status === 'playing' && unlimited.guesses.length)
            set({ stats: { ...stats, unlimited: recordResult(stats.unlimited, { daily: false, won: false, bucket: 0 }) } });
          set({ mode: 'unlimited', unlimited: makeRound('unlimited', pool, pockets) });
        },

        guess: (id) =>
          update((r) => {
            if (r.guesses.includes(id)) return null;
            const guesses = [...r.guesses, id];
            const status = id === r.targetId ? 'won' : guesses.length >= MAX_GUESSES ? 'lost' : 'playing';
            return { ...r, guesses, status };
          }),

        giveUp: () => update((r) => ({ ...r, status: 'lost' })),
      };
    },
    { name: 'pokewwww-items', version: 1 },
  ),
);
