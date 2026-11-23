import { dailySeed, mulberry32, pick } from './rng';

/** Contents of locations.json (see scripts/build-locations.ts). */
export interface LocationData {
  /** location id → [name, region] */
  locations: Record<string, [string, string]>;
  /** Pokémon id → [location id, min level, max level][] */
  pokemon: Record<string, [number, number, number][]>;
}

/** Explore only uses places with a guessable number of Pokémon. */
export const MAP_MIN = 3;
export const MAP_MAX = 25;

export const REGION_ORDER = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova', 'Kalos', 'Alola', 'Galar', 'Orre'];
/** Orre (the Colosseum games) is only offered in unlimited: its places are too obscure for a daily. */
const DAILY_EXCLUDED = new Set(['Orre']);

/** One place being played: name every Pokémon that appears there. */
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

export const newMapRound = (loc: number, region: string, total: number): MapRound => ({
  loc,
  region,
  total,
  found: [],
  wrong: [],
  status: 'playing',
});

/** The round after a guess; null when it is ignored (a repeat, or the map is over). */
export function applyGuess(map: MapRound, id: number, inMap: boolean): MapRound | null {
  if (map.status !== 'playing' || map.found.includes(id) || map.wrong.includes(id)) return null;
  if (!inMap) return { ...map, wrong: [...map.wrong, id] };
  const found = [...map.found, id];
  return { ...map, found, status: found.length >= map.total ? 'done' : 'playing' };
}

/** Pokémon found at a place, by dex number. */
export function membersOf(data: LocationData, loc: number): number[] {
  return Object.entries(data.pokemon)
    .filter(([, list]) => list.some((e) => e[0] === loc))
    .map(([id]) => Number(id))
    .sort((a, b) => a - b);
}

/** Level range of a Pokémon at one place. */
export function levelsAt(data: LocationData, id: number, loc: number): [number, number] | null {
  const e = data.pokemon[id]?.find((x) => x[0] === loc);
  return e ? [e[1], e[2]] : null;
}

/** Regions that have places to play, in game order. */
export function regionsOf(data: LocationData): string[] {
  const present = new Set(Object.values(data.locations).map((l) => l[1]));
  return REGION_ORDER.filter((r) => present.has(r));
}

export interface MapInfo {
  loc: number;
  region: string;
  count: number;
}

/** Places with a guessable number of Pokémon, optionally for one region. Sorted by id, so seeded picks are stable. */
export function mapsFor(data: LocationData, region?: string): MapInfo[] {
  const counts = new Map<number, number>();
  for (const list of Object.values(data.pokemon)) for (const e of list) counts.set(e[0], (counts.get(e[0]) ?? 0) + 1);
  return Object.entries(data.locations)
    .filter(([, l]) => !region || l[1] === region)
    .map(([loc, l]) => ({ loc: Number(loc), region: l[1], count: counts.get(Number(loc)) ?? 0 }))
    .filter((m) => m.count >= MAP_MIN && m.count <= MAP_MAX)
    .sort((a, b) => a.loc - b.loc);
}

/** Today's place: the same for everyone, from every region but Orre. */
export function dailyMap(data: LocationData, date?: Date): MapInfo {
  const maps = mapsFor(data).filter((m) => !DAILY_EXCLUDED.has(m.region));
  return pick(maps, mulberry32(dailySeed('gps', date)));
}

/** A place not visited yet; once all are, the cycle starts over (the current one is avoided). */
export function pickMap(maps: { loc: number }[], visited: readonly number[], rand: () => number, current?: number): number | null {
  const unseen = maps.filter((m) => !visited.includes(m.loc));
  const pool = unseen.length ? unseen : maps.filter((m) => m.loc !== current);
  const list = pool.length ? pool : maps;
  return list.length ? list[Math.floor(rand() * list.length)].loc : null;
}

/** ✅/🟥 share row: one square per Pokémon found, then the wrong guesses. */
export function shareRow(map: MapRound): string {
  return '🟩'.repeat(map.found.length) + '⬜'.repeat(Math.max(0, map.total - map.found.length)) + '🟥'.repeat(Math.min(map.wrong.length, 10));
}
