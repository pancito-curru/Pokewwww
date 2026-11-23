import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** One place being explored: name every Pokémon that appears there. */
export interface MapRound {
  loc: number;
  region: string;
  /** How many Pokémon appear here. */
  total: number;
  found: number[];
  /** Guesses that don't appear here. */
  wrong: number[];
  status: 'playing' | 'done' | 'gaveUp';
}

interface ExploreState {
  region: string | null;
  map: MapRound | null;
  /** Places already played per region, so "next map" never repeats until all are done. */
  visited: Record<string, number[]>;
  stats: { maps: number; pokemon: number; perRegion: Record<string, number> };
  setRegion: (region: string | null) => void;
  /** Start a place; `fresh` clears the region's history (every place has been played). */
  start: (region: string, loc: number, total: number, fresh?: boolean) => void;
  /** `inMap` = the Pokémon appears at this place. Returns false when the guess was ignored. */
  guess: (id: number, inMap: boolean) => boolean;
  giveUp: () => void;
}

export const useExploreStore = create<ExploreState>()(
  persist(
    (set, get) => ({
      region: null,
      map: null,
      visited: {},
      stats: { maps: 0, pokemon: 0, perRegion: {} },

      setRegion: (region) => set({ region, ...(region === null && { map: null }) }),

      start: (region, loc, total, fresh = false) => {
        const { visited } = get();
        set({
          region,
          map: { loc, region, total, found: [], wrong: [], status: 'playing' },
          visited: { ...visited, [region]: [...(fresh ? [] : (visited[region] ?? [])), loc] },
        });
      },

      guess: (id, inMap) => {
        const { map, stats } = get();
        if (!map || map.status !== 'playing' || map.found.includes(id) || map.wrong.includes(id)) return false;
        if (!inMap) {
          set({ map: { ...map, wrong: [...map.wrong, id] } });
          return true;
        }
        const found = [...map.found, id];
        const done = found.length >= map.total;
        set({
          map: { ...map, found, status: done ? 'done' : 'playing' },
          ...(done && {
            stats: {
              maps: stats.maps + 1,
              pokemon: stats.pokemon + found.length,
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
    { name: 'pokewwww-gpsmap', version: 1 },
  ),
);
