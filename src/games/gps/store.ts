import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { applyGuess, newMapRound, type MapRound } from '../../lib/gps';
import { todayKey } from '../../lib/rng';
import { emptyStats, recordResult, type PuzzleStats } from '../../lib/stats';

export type GpsMode = 'daily' | 'unlimited';

/** Today's place; `key` is the date it belongs to. */
export type DailyMap = MapRound & { key: string };

interface GpsState {
  mode: GpsMode;
  daily: DailyMap | null;
  dailyStats: PuzzleStats;
  /** Unlimited: the chosen region and the place being played in it. */
  region: string | null;
  map: MapRound | null;
  /** Places already played per region, so "next map" never repeats until all are done. */
  visited: Record<string, number[]>;
  stats: { maps: number; pokemon: number; perRegion: Record<string, number> };

  setMode: (mode: GpsMode) => void;
  /** Create today's place if the stored one is from another day. */
  ensureDaily: (loc: number, region: string, total: number) => void;
  /** `inMap` = the Pokémon appears at this place. Returns false when the guess was ignored. */
  guessDaily: (id: number, inMap: boolean) => boolean;
  giveUpDaily: () => void;

  setRegion: (region: string | null) => void;
  /** Start a place; `fresh` clears the region's history (every place has been played). */
  start: (region: string, loc: number, total: number, fresh?: boolean) => void;
  guess: (id: number, inMap: boolean) => boolean;
  giveUp: () => void;
}

export const useGpsStore = create<GpsState>()(
  persist(
    (set, get) => ({
      mode: 'daily',
      daily: null,
      dailyStats: emptyStats(),
      region: null,
      map: null,
      visited: {},
      stats: { maps: 0, pokemon: 0, perRegion: {} },

      setMode: (mode) => set({ mode }),

      ensureDaily: (loc, region, total) => {
        if (get().daily?.key === todayKey()) return;
        set({ daily: { ...newMapRound(loc, region, total), key: todayKey() } });
      },

      guessDaily: (id, inMap) => {
        const { daily, dailyStats } = get();
        const next = daily && applyGuess(daily, id, inMap);
        if (!daily || !next) return false;
        const finished = next.status !== 'playing';
        set({
          daily: { ...next, key: daily.key },
          ...(finished && {
            dailyStats: recordResult(dailyStats, { daily: true, won: true, bucket: next.wrong.length, date: daily.key }),
          }),
        });
        return true;
      },

      giveUpDaily: () => {
        const { daily, dailyStats } = get();
        if (daily?.status !== 'playing') return;
        set({
          daily: { ...daily, status: 'gaveUp' },
          dailyStats: recordResult(dailyStats, { daily: true, won: false, bucket: 0, date: daily.key }),
        });
      },

      setRegion: (region) => set({ region, ...(region === null && { map: null }) }),

      start: (region, loc, total, fresh = false) => {
        const { visited } = get();
        set({
          region,
          map: newMapRound(loc, region, total),
          visited: { ...visited, [region]: [...(fresh ? [] : (visited[region] ?? [])), loc] },
        });
      },

      guess: (id, inMap) => {
        const { map, stats } = get();
        const next = map && applyGuess(map, id, inMap);
        if (!map || !next) return false;
        set({
          map: next,
          ...(next.status === 'done' && {
            stats: {
              maps: stats.maps + 1,
              pokemon: stats.pokemon + next.found.length,
              perRegion: { ...stats.perRegion, [map.region]: (stats.perRegion[map.region] ?? 0) + 1 },
            },
          }),
        });
        return true;
      },

      giveUp: () => {
        const { map } = get();
        if (map?.status === 'playing') set({ map: { ...map, status: 'gaveUp' } });
      },
    }),
    // Same key the explore mode already used, so players keep their progress.
    { name: 'pokewwww-gpsmap', version: 1 },
  ),
);
