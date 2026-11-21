import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { POKEDEX, getPool } from '../../data';
import { dailySeed, mulberry32, pick, randomSeed, todayKey } from '../../lib/rng';
import { availableLengths, isValidName, rowsFor } from '../../lib/wordle';

export type WordleMode = 'daily' | 'unlimited';

export interface WordleSettings {
  mode: WordleMode;
  length: number;
  /** Unlimited only; empty = all. */
  generations: number[];
  strict: boolean;
}

export interface WordleRound {
  mode: WordleMode;
  length: number;
  /** Date for daily rounds, seed for unlimited ones. */
  key: string;
  targetId: number;
  answer: string;
  guesses: string[];
  maxRows: number;
  hintUsed: boolean;
  strict: boolean;
  generations: number[];
  status: 'playing' | 'won' | 'lost';
}

export interface WordleStats {
  played: number;
  wins: number;
  streak: number;
  maxStreak: number;
  distribution: Record<number, number>;
  lastDaily?: string;
}

export type SubmitResult = 'ok' | 'short' | 'invalid';

interface WordleState {
  screen: 'setup' | 'game';
  settings: WordleSettings;
  /** Rounds keyed by `${mode}:${length}`. */
  rounds: Record<string, WordleRound>;
  stats: Record<string, WordleStats>;
  setSettings: (patch: Partial<WordleSettings>) => void;
  /** Open the round for the current settings (resume, or start a new one). */
  play: () => void;
  newUnlimited: () => void;
  submit: (guess: string) => SubmitResult;
  revealHint: () => void;
  toSetup: () => void;
}

export const roundKey = (mode: WordleMode, length: number) => `${mode}:${length}`;

const emptyStats = (): WordleStats => ({ played: 0, wins: 0, streak: 0, maxStreak: 0, distribution: {} });

function makeRound(settings: WordleSettings): WordleRound {
  const { mode, length } = settings;
  const daily = mode === 'daily';
  const seed = daily ? dailySeed(`wordle-${length}`) : randomSeed();
  const all = availableLengths(daily ? POKEDEX : getPool({ generations: settings.generations }));
  const pool = all.find((l) => l.length === length)?.pool ?? all[0].pool;
  const target = pick(pool, mulberry32(seed));
  return {
    mode,
    length: target.letters.length,
    key: daily ? todayKey() : String(seed),
    targetId: target.id,
    answer: target.letters,
    guesses: [],
    maxRows: rowsFor(target.letters.length),
    hintUsed: false,
    strict: settings.strict,
    generations: daily ? [] : settings.generations,
    status: 'playing',
  };
}

function recordResult(stats: WordleStats, round: WordleRound): WordleStats {
  const won = round.status === 'won';
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
    lastDaily: round.mode === 'daily' ? todayKey() : stats.lastDaily,
  };
}

export const useWordleStore = create<WordleState>()(
  persist(
    (set, get) => {
      const current = () => {
        const { settings, rounds } = get();
        return rounds[roundKey(settings.mode, settings.length)];
      };

      const save = (round: WordleRound) => {
        const k = roundKey(round.mode, round.length);
        const { rounds, stats } = get();
        const finished = round.status !== 'playing';
        set({
          rounds: { ...rounds, [k]: round },
          ...(finished && { stats: { ...stats, [k]: recordResult(stats[k] ?? emptyStats(), round) } }),
        });
      };

      return {
        screen: 'setup',
        settings: { mode: 'daily', length: 7, generations: [], strict: true },
        rounds: {},
        stats: {},

        setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

        play: () => {
          const { settings, rounds } = get();
          const existing = rounds[roundKey(settings.mode, settings.length)];
          const resumable =
            settings.mode === 'daily'
              ? existing?.key === todayKey()
              : existing?.status === 'playing' &&
                existing.strict === settings.strict &&
                existing.generations.join() === settings.generations.join();
          if (!resumable) {
            const r = makeRound(settings);
            // r.length may differ if the chosen length had no pool; follow the round.
            set({ rounds: { ...rounds, [roundKey(r.mode, r.length)]: r }, settings: { ...settings, length: r.length } });
          }
          set({ screen: 'game' });
        },

        newUnlimited: () => {
          const settings = { ...get().settings, mode: 'unlimited' as const };
          const old = get().rounds[roundKey('unlimited', settings.length)];
          // Abandoning a round you've guessed in counts as a loss.
          if (old?.status === 'playing' && old.guesses.length) save({ ...old, status: 'lost' });
          const r = makeRound(settings);
          set({
            settings: { ...settings, length: r.length },
            rounds: { ...get().rounds, [roundKey(r.mode, r.length)]: r },
            screen: 'game',
          });
        },

        submit: (guess) => {
          const r = current();
          if (!r || r.status !== 'playing') return 'ok';
          if (guess.length !== r.length) return 'short';
          if (r.strict && !isValidName(guess)) return 'invalid';
          const guesses = [...r.guesses, guess];
          const status = guess === r.answer ? 'won' : guesses.length >= r.maxRows ? 'lost' : 'playing';
          save({ ...r, guesses, status });
          return 'ok';
        },

        revealHint: () => {
          const r = current();
          // Costs a row, so at least one must remain afterwards.
          if (!r || r.status !== 'playing' || r.hintUsed || r.maxRows - r.guesses.length <= 1) return;
          save({ ...r, hintUsed: true, maxRows: r.maxRows - 1 });
        },

        toSetup: () => set({ screen: 'setup' }),
      };
    },
    { name: 'pokewwww-wordle', version: 1 },
  ),
);

export const useCurrentRound = () =>
  useWordleStore((s) => s.rounds[roundKey(s.settings.mode, s.settings.length)] as WordleRound | undefined);
