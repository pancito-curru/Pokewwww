import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { POKEDEX, getPool } from '../../data';
import { dailySeed, randomSeed, todayKey } from '../../lib/rng';
import { generateCrossword, placementCells, type Crossword } from '../../lib/crossword/generator';
import { buildClues, type ClueDifficulty } from '../../lib/crossword/clues';

export type CrossMode = 'daily' | 'unlimited';
export type CrossSize = 'small' | 'medium' | 'large';

export const SIZES: Record<CrossSize, { words: number; maxSize: number; label: string }> = {
  small: { words: 8, maxSize: 11, label: 'Small' },
  medium: { words: 12, maxSize: 13, label: 'Medium' },
  large: { words: 18, maxSize: 15, label: 'Large' },
};

export const DAILY_SETTINGS = { size: 'medium' as CrossSize, difficulty: 'normal' as ClueDifficulty };

export interface CrossSettings {
  mode: CrossMode;
  size: CrossSize;
  difficulty: ClueDifficulty;
  generations: number[];
}

export interface CrossRound {
  mode: CrossMode;
  key: string;
  size: CrossSize;
  difficulty: ClueDifficulty;
  puzzle: Crossword;
  /** Player letters, row-major, '' = empty. */
  entries: string[];
  /** Cell indices filled by "Reveal". */
  revealed: number[];
  startedAt: number;
  solvedAt: number | null;
}

export interface CrossStats {
  solved: number;
  /** Fastest clean solve (no reveals) per size, ms. */
  best: Partial<Record<CrossSize, number>>;
}

interface CrossState {
  screen: 'setup' | 'game';
  settings: CrossSettings;
  daily: CrossRound | null;
  unlimited: CrossRound | null;
  stats: Record<CrossMode, CrossStats>;
  setSettings: (patch: Partial<CrossSettings>) => void;
  play: () => void;
  newUnlimited: () => void;
  setEntry: (index: number, letter: string) => void;
  revealWord: (placementId: number) => void;
  reset: () => void;
  toSetup: () => void;
}

function makeRound(s: CrossSettings): CrossRound {
  const daily = s.mode === 'daily';
  const { size, difficulty } = daily ? DAILY_SETTINGS : s;
  const seed = daily ? dailySeed('crossword') : randomSeed();
  const { words, maxSize } = SIZES[size];
  const pool = daily ? POKEDEX : getPool({ generations: s.generations });
  const puzzle = buildClues(generateCrossword(pool, { words, maxSize, seed }), difficulty, seed);
  return {
    mode: s.mode,
    key: daily ? todayKey() : String(seed),
    size,
    difficulty,
    puzzle,
    entries: Array(puzzle.width * puzzle.height).fill(''),
    revealed: [],
    startedAt: Date.now(),
    solvedAt: null,
  };
}

export const isSolved = (r: CrossRound) =>
  r.puzzle.cells.flat().every((ch, i) => ch === null || r.entries[i] === ch);

export const useCrossStore = create<CrossState>()(
  persist(
    (set, get) => {
      const current = () => get()[get().settings.mode];

      const save = (r: CrossRound) => {
        const { stats } = get();
        if (r.solvedAt === null && isSolved(r)) {
          r = { ...r, solvedAt: Date.now() };
          const s = stats[r.mode];
          const ms = r.solvedAt! - r.startedAt;
          const clean = r.revealed.length === 0;
          const prev = s.best[r.size];
          set({
            stats: {
              ...stats,
              [r.mode]: {
                solved: s.solved + 1,
                best: clean && (prev === undefined || ms < prev) ? { ...s.best, [r.size]: ms } : s.best,
              },
            },
          });
        }
        set({ [r.mode]: r } as Partial<CrossState>);
      };

      return {
        screen: 'setup',
        settings: { mode: 'daily', size: 'medium', difficulty: 'normal', generations: [] },
        daily: null,
        unlimited: null,
        stats: { daily: { solved: 0, best: {} }, unlimited: { solved: 0, best: {} } },

        setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

        play: () => {
          const { settings } = get();
          const r = current();
          const resumable = settings.mode === 'daily' ? r?.key === todayKey() : r && r.solvedAt === null;
          if (!resumable) set({ [settings.mode]: makeRound(settings) } as Partial<CrossState>);
          set({ screen: 'game' });
        },

        newUnlimited: () => {
          const settings = { ...get().settings, mode: 'unlimited' as const };
          set({ settings, unlimited: makeRound(settings), screen: 'game' });
        },

        setEntry: (index, letter) => {
          const r = current();
          if (!r || r.solvedAt !== null || r.puzzle.cells.flat()[index] === null) return;
          const entries = [...r.entries];
          entries[index] = letter.toUpperCase();
          save({ ...r, entries });
        },

        revealWord: (id) => {
          const r = current();
          const pl = r?.puzzle.placements.find((p) => p.id === id);
          if (!r || !pl || r.solvedAt !== null) return;
          const entries = [...r.entries];
          const revealed = new Set(r.revealed);
          placementCells(pl).forEach(([row, col], i) => {
            const idx = row * r.puzzle.width + col;
            if (entries[idx] !== pl.answer[i]) revealed.add(idx);
            entries[idx] = pl.answer[i];
          });
          save({ ...r, entries, revealed: [...revealed] });
        },

        reset: () => {
          const r = current();
          if (!r || r.solvedAt !== null) return;
          set({
            [r.mode]: { ...r, entries: r.entries.map(() => ''), revealed: [], startedAt: Date.now() },
          } as Partial<CrossState>);
        },

        toSetup: () => set({ screen: 'setup' }),
      };
    },
    { name: 'pokewwww-crossword', version: 1 },
  ),
);
