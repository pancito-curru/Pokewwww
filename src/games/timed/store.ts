import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getPool } from '../../data';
import { scopeKey } from '../../lib/timed';

export interface TimedSettings {
  /** Minutes, or null for untimed. */
  duration: number | null;
  /** Empty = all generations. */
  generations: number[];
  silhouettes: boolean;
}

export type EndReason = 'time' | 'gaveUp' | 'complete';

export interface TimedGame {
  status: 'setup' | 'playing' | 'ended';
  settings: TimedSettings;
  scopeIds: number[];
  /** Found ids in the order they were found. */
  found: number[];
  startedAt: number;
  endsAt: number | null;
  endedAt: number | null;
  endReason: EndReason | null;
  newBest: boolean;
}

export interface BestScore {
  found: number;
  total: number;
  ms: number;
  date: string;
}

interface TimedState {
  settings: TimedSettings;
  game: TimedGame;
  best: Record<string, BestScore>;
  setSettings: (patch: Partial<TimedSettings>) => void;
  start: () => void;
  find: (id: number) => void;
  finish: (reason: EndReason) => void;
  toSetup: () => void;
}

const DEFAULT_SETTINGS: TimedSettings = { duration: 10, generations: [1], silhouettes: true };

const emptyGame = (settings: TimedSettings): TimedGame => ({
  status: 'setup',
  settings,
  scopeIds: [],
  found: [],
  startedAt: 0,
  endsAt: null,
  endedAt: null,
  endReason: null,
  newBest: false,
});

export const useTimedStore = create<TimedState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      game: emptyGame(DEFAULT_SETTINGS),
      best: {},

      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      start: () => {
        const settings = get().settings;
        const now = Date.now();
        set({
          game: {
            ...emptyGame(settings),
            status: 'playing',
            scopeIds: getPool({ generations: settings.generations }).map((p) => p.id),
            startedAt: now,
            endsAt: settings.duration ? now + settings.duration * 60_000 : null,
          },
        });
      },

      find: (id) => {
        const { game } = get();
        if (game.status !== 'playing' || game.found.includes(id)) return;
        const found = [...game.found, id];
        set({ game: { ...game, found } });
        if (found.length === game.scopeIds.length) get().finish('complete');
      },

      finish: (reason) => {
        const { game, best } = get();
        if (game.status !== 'playing') return;
        const endedAt = game.endsAt ? Math.min(Date.now(), game.endsAt) : Date.now();
        const ms = endedAt - game.startedAt;
        const key = scopeKey(game.settings.generations, game.settings.duration);
        const prev = best[key];
        const score = game.found.length;
        const newBest = score > 0 && (!prev || score > prev.found || (score === prev.found && ms < prev.ms));
        set({
          game: { ...game, status: 'ended', endedAt, endReason: reason, newBest },
          best: newBest
            ? { ...best, [key]: { found: score, total: game.scopeIds.length, ms, date: new Date().toISOString() } }
            : best,
        });
      },

      toSetup: () => set((s) => ({ game: emptyGame(s.settings) })),
    }),
    { name: 'pokewwww-timed', version: 1 },
  ),
);
