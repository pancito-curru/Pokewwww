import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { POKEDEX, getPool } from '../../data';
import { dailySeed, mulberry32, pick, randomSeed, todayKey } from '../../lib/rng';

export type GuessMode = 'daily' | 'unlimited';
export type HintKey = 'genus' | 'flavor' | 'silhouette';
export const HINTS: HintKey[] = ['genus', 'flavor', 'silhouette'];

/** Guess count at which each hint unlocks. Hard mode (8 guesses) unlocks sooner. */
export function hintUnlocks(maxGuesses: number | null): Record<HintKey, number> {
  return maxGuesses ? { genus: 3, flavor: 5, silhouette: 7 } : { genus: 4, flavor: 7, silhouette: 10 };
}

export const HARD_MAX_GUESSES = 8;

export interface GuessRound {
  mode: GuessMode;
  /** Date for daily rounds, seed for unlimited ones. */
  key: string;
  targetId: number;
  /** Oldest first. */
  guesses: number[];
  hintsUsed: HintKey[];
  maxGuesses: number | null;
  generations: number[];
  status: 'playing' | 'won' | 'lost';
}

export interface GuessStats {
  played: number;
  wins: number;
  streak: number;
  maxStreak: number;
  /** wins by guess count: { 3: 2, 5: 1 } */
  distribution: Record<number, number>;
  /** Date of the last finished daily (daily stats only). */
  lastDaily?: string;
}

export interface GuessSettings {
  generations: number[];
  hard: boolean;
}

interface GuessState {
  mode: GuessMode;
  settings: GuessSettings;
  daily: GuessRound | null;
  unlimited: GuessRound | null;
  stats: Record<GuessMode, GuessStats>;
  setMode: (mode: GuessMode) => void;
  setSettings: (patch: Partial<GuessSettings>) => void;
  /** Create today's daily / the first unlimited round if needed. */
  ensureRound: () => void;
  newUnlimited: () => void;
  guess: (id: number) => void;
  revealHint: (hint: HintKey) => void;
  giveUp: () => void;
}

const emptyStats = (): GuessStats => ({ played: 0, wins: 0, streak: 0, maxStreak: 0, distribution: {} });

function makeRound(mode: GuessMode, settings: GuessSettings): GuessRound {
  const daily = mode === 'daily';
  const seed = daily ? dailySeed('guess') : randomSeed();
  // The daily is the same for everyone: full dex, unlimited guesses.
  const pool = daily ? POKEDEX : getPool({ generations: settings.generations });
  return {
    mode,
    key: daily ? todayKey() : String(seed),
    targetId: pick(pool, mulberry32(seed)).id,
    guesses: [],
    hintsUsed: [],
    maxGuesses: !daily && settings.hard ? HARD_MAX_GUESSES : null,
    generations: daily ? [] : settings.generations,
    status: 'playing',
  };
}

function recordResult(stats: GuessStats, round: GuessRound): GuessStats {
  const won = round.status === 'won';
  const today = todayKey();
  const yesterday = todayKey(new Date(Date.now() - 86_400_000));
  const continues = round.mode === 'unlimited' || stats.lastDaily === yesterday;
  const streak = won ? (continues ? stats.streak + 1 : 1) : 0;
  const n = round.guesses.length;
  return {
    played: stats.played + 1,
    wins: stats.wins + (won ? 1 : 0),
    streak,
    maxStreak: Math.max(stats.maxStreak, streak),
    distribution: won ? { ...stats.distribution, [n]: (stats.distribution[n] ?? 0) + 1 } : stats.distribution,
    lastDaily: round.mode === 'daily' ? today : stats.lastDaily,
  };
}

export const useGuessStore = create<GuessState>()(
  persist(
    (set, get) => {
      /** Apply a change to the active round, updating stats if it just ended. */
      const update = (fn: (r: GuessRound) => GuessRound) => {
        const { mode, stats } = get();
        const round = get()[mode];
        if (!round || round.status !== 'playing') return;
        const next = fn(round);
        set({
          [mode]: next,
          ...(next.status !== 'playing' && { stats: { ...stats, [mode]: recordResult(stats[mode], next) } }),
        } as Partial<GuessState>);
      };

      return {
        mode: 'daily',
        settings: { generations: [], hard: false },
        daily: null,
        unlimited: null,
        stats: { daily: emptyStats(), unlimited: emptyStats() },

        setMode: (mode) => {
          set({ mode });
          get().ensureRound();
        },
        setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

        ensureRound: () => {
          const { mode, daily, unlimited, settings } = get();
          if (mode === 'daily' && daily?.key !== todayKey()) set({ daily: makeRound('daily', settings) });
          if (mode === 'unlimited' && !unlimited) set({ unlimited: makeRound('unlimited', settings) });
        },

        newUnlimited: () => {
          const { unlimited, stats } = get();
          // Abandoning a round in progress counts as a loss once you've guessed.
          if (unlimited?.status === 'playing' && unlimited.guesses.length > 0)
            set({ stats: { ...stats, unlimited: recordResult(stats.unlimited, { ...unlimited, status: 'lost' }) } });
          set({ mode: 'unlimited', unlimited: makeRound('unlimited', get().settings) });
        },

        guess: (id) =>
          update((r) => {
            if (r.guesses.includes(id)) return r;
            const guesses = [...r.guesses, id];
            const status =
              id === r.targetId ? 'won' : r.maxGuesses && guesses.length >= r.maxGuesses ? 'lost' : 'playing';
            return { ...r, guesses, status };
          }),

        revealHint: (hint) =>
          update((r) => {
            const unlocked = r.guesses.length >= hintUnlocks(r.maxGuesses)[hint];
            return unlocked && !r.hintsUsed.includes(hint) ? { ...r, hintsUsed: [...r.hintsUsed, hint] } : r;
          }),

        giveUp: () => update((r) => ({ ...r, status: 'lost' })),
      };
    },
    { name: 'pokewwww-guess', version: 1 },
  ),
);
