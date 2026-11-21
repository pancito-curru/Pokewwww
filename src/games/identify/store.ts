import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { POKEDEX, getPool } from '../../data';
import { dailySeed, mulberry32, pick, randomSeed, shuffle, todayKey } from '../../lib/rng';
import { judge, MAX_ATTEMPTS, runKey, summarize, type GuessOutcome, type RunItem } from '../../lib/identify';
import type { IdentifyKind } from './kinds';

export type IdentifyMode = 'daily' | 'run';

export interface IdentifySettings {
  mode: IdentifyMode;
  /** Run only; empty = all generations. */
  generations: number[];
  /** Run length in minutes. */
  minutes: number;
}

export interface DailyRound {
  key: string;
  item: RunItem;
}

export interface Run {
  status: 'playing' | 'ended';
  generations: number[];
  minutes: number;
  startedAt: number;
  endsAt: number;
  endedAt: number | null;
  /** Shuffled answer pool; the run walks through it in order. */
  order: number[];
  items: RunItem[];
  /** True while the finished current item is shown before moving on. */
  revealing: boolean;
  newBest: boolean;
}

export interface DailyStats {
  played: number;
  wins: number;
  streak: number;
  maxStreak: number;
  /** wins by number of tries: { 1: 4, 2: 1 } */
  distribution: Record<number, number>;
  lastDaily?: string;
}

export interface RunBest {
  correct: number;
  date: string;
}

interface IdentifyState {
  screen: 'setup' | 'game';
  settings: IdentifySettings;
  daily: DailyRound | null;
  run: Run | null;
  dailyStats: DailyStats;
  best: Record<string, RunBest>;

  setSettings: (patch: Partial<IdentifySettings>) => void;
  openDaily: () => void;
  guessDaily: (id: number) => GuessOutcome;
  startRun: () => void;
  guessRun: (id: number) => GuessOutcome;
  skipRun: () => void;
  /** Move past a revealed item to the next one. */
  nextRun: () => void;
  endRun: () => void;
  toSetup: () => void;
}

const emptyStats = (): DailyStats => ({ played: 0, wins: 0, streak: 0, maxStreak: 0, distribution: {} });

export const dailyTarget = (kind: IdentifyKind, date = new Date()) =>
  pick(POKEDEX, mulberry32(dailySeed(kind, date))).id;

const newItem = (id: number): RunItem => ({ id, wrong: [], result: null });

export function createIdentifyStore(kind: IdentifyKind) {
  return create<IdentifyState>()(
    persist(
      (set, get) => {
        const finishRun = (run: Run): Run => {
          if (run.status === 'ended') return run;
          const { best } = get();
          const key = runKey(run.generations, run.minutes);
          const correct = summarize(run.items).correct;
          const prev = best[key];
          const newBest = correct > 0 && (!prev || correct > prev.correct);
          if (newBest) set({ best: { ...best, [key]: { correct, date: new Date().toISOString() } } });
          return {
            ...run,
            status: 'ended',
            endedAt: Math.min(Date.now(), run.endsAt),
            revealing: false,
            // An item still being guessed when time runs out doesn't count either way.
            items: run.items.filter((i) => i.result),
            newBest,
          };
        };

        return {
          screen: 'setup',
          settings: { mode: 'daily', generations: [], minutes: 2 },
          daily: null,
          run: null,
          dailyStats: emptyStats(),
          best: {},

          setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

          openDaily: () => {
            const today = todayKey();
            if (get().daily?.key !== today) set({ daily: { key: today, item: newItem(dailyTarget(kind)) } });
            set({ screen: 'game', settings: { ...get().settings, mode: 'daily' } });
          },

          guessDaily: (id) => {
            const d = get().daily;
            if (!d || d.key !== todayKey()) return 'repeat';
            const { outcome, item } = judge(d.item, id);
            if (outcome === 'repeat') return outcome;
            set({ daily: { ...d, item } });
            if (item.result) {
              const s = get().dailyStats;
              const won = item.result === 'correct';
              const yesterday = todayKey(new Date(Date.now() - 86_400_000));
              const streak = won ? (s.lastDaily === yesterday ? s.streak + 1 : 1) : 0;
              const tries = item.wrong.length + 1;
              set({
                dailyStats: {
                  played: s.played + 1,
                  wins: s.wins + (won ? 1 : 0),
                  streak,
                  maxStreak: Math.max(s.maxStreak, streak),
                  distribution: won ? { ...s.distribution, [tries]: (s.distribution[tries] ?? 0) + 1 } : s.distribution,
                  lastDaily: d.key,
                },
              });
            }
            return outcome;
          },

          startRun: () => {
            const { generations, minutes } = get().settings;
            const order = shuffle(
              getPool({ generations }).map((p) => p.id),
              mulberry32(randomSeed()),
            );
            const now = Date.now();
            set({
              screen: 'game',
              settings: { ...get().settings, mode: 'run' },
              run: {
                status: 'playing',
                generations,
                minutes,
                startedAt: now,
                endsAt: now + minutes * 60_000,
                endedAt: null,
                order,
                items: [newItem(order[0])],
                revealing: false,
                newBest: false,
              },
            });
          },

          guessRun: (id) => {
            const run = get().run;
            if (!run || run.status !== 'playing' || run.revealing) return 'repeat';
            if (Date.now() >= run.endsAt) {
              get().endRun();
              return 'repeat';
            }
            const current = run.items[run.items.length - 1];
            const { outcome, item } = judge(current, id);
            if (outcome === 'repeat') return outcome;
            set({ run: { ...run, items: [...run.items.slice(0, -1), item], revealing: !!item.result } });
            return outcome;
          },

          skipRun: () => {
            const run = get().run;
            if (!run || run.status !== 'playing' || run.revealing) return;
            const current = run.items[run.items.length - 1];
            set({ run: { ...run, items: [...run.items.slice(0, -1), { ...current, result: 'skipped' }], revealing: true } });
          },

          nextRun: () => {
            const run = get().run;
            if (!run || run.status !== 'playing' || !run.revealing) return;
            const nextId = run.order[run.items.length];
            if (nextId === undefined || Date.now() >= run.endsAt) {
              set({ run: finishRun(run) });
              return;
            }
            set({ run: { ...run, items: [...run.items, newItem(nextId)], revealing: false } });
          },

          endRun: () => {
            const run = get().run;
            if (run) set({ run: finishRun(run) });
          },

          toSetup: () => set({ screen: 'setup' }),
        };
      },
      { name: `pokewwww-${kind}`, version: 1 },
    ),
  );
}

export const identifyStores = {
  silhouette: createIdentifyStore('silhouette'),
  cry: createIdentifyStore('cry'),
};

export { MAX_ATTEMPTS };
