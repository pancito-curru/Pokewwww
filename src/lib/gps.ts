import type { Pokemon, PokeType } from '../data';
import { dailySeed, mulberry32, shuffle } from './rng';

/** Contents of locations.json (see scripts/build-locations.ts). */
export interface LocationData {
  /** location id → [name, region] */
  locations: Record<string, [string, string]>;
  /** Pokémon id → [location id, min level, max level][] */
  pokemon: Record<string, [number, number, number][]>;
}

/** Wrong guesses allowed in the clue game. */
export const MAX_GUESSES = 6;
/** Misses after which the Pokédex entry is shown. */
export const HINT_AFTER = 4;
/** Places listed in a clue; a Pokémon found in more shows a sample and "+N more". */
export const MAX_SHOWN = 8;
/** Explore mode only uses places with a guessable number of Pokémon. */
export const MAP_MIN = 3;
export const MAP_MAX = 25;

export const REGION_ORDER = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova', 'Kalos', 'Alola', 'Galar', 'Orre'];

export interface Spot {
  loc: number;
  name: string;
  region: string;
  min: number;
  max: number;
}

export const hasEncounters = (data: LocationData, id: number) => !!data.pokemon[id];

/** Every place a Pokémon is found in the wild. */
export function spotsOf(data: LocationData, id: number): Spot[] {
  return (data.pokemon[id] ?? []).map(([loc, min, max]) => {
    const [name, region] = data.locations[loc];
    return { loc, name, region, min, max };
  });
}

/** The round's seed (daily rounds are keyed by their date, unlimited ones by the seed). */
export const roundSeed = (r: { mode: 'daily' | 'unlimited'; key: string }) =>
  r.mode === 'daily' ? dailySeed('gps', new Date(`${r.key}T12:00:00`)) : Number(r.key);

/** Extra facts, shown only when several Pokémon fit the type and places alone. */
export interface Extras {
  stage: 1 | 2 | 3;
  generation: number;
  min: number;
  max: number;
}

export interface Clue {
  types: PokeType[];
  spots: Spot[];
  /** Places the Pokémon is found in that aren't listed. */
  more: number;
  extras: Extras | null;
}

const sameTypes = (a: readonly PokeType[], b: readonly PokeType[]) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

const rangeAt = (spots: Spot[], locs: number[]) => {
  const at = spots.filter((s) => locs.includes(s.loc));
  return { min: Math.min(...at.map((s) => s.min)), max: Math.max(...at.map((s) => s.max)) };
};

/** Whether `guess` is consistent with the type and places shown (and the extras, when shown). */
function matches(data: LocationData, shown: Spot[], types: readonly PokeType[], extras: Extras | null, guess: Pokemon): boolean {
  if (!sameTypes(guess.types, types)) return false;
  const locs = shown.map((s) => s.loc);
  const mine = spotsOf(data, guess.id);
  if (!locs.every((l) => mine.some((s) => s.loc === l))) return false;
  if (!extras) return true;
  if (guess.evoStage !== extras.stage || guess.generation !== extras.generation) return false;
  const g = rangeAt(mine, locs);
  return g.min <= extras.max && g.max >= extras.min;
}

/**
 * The clue for a round: the Pokémon's types and where it is found. If other Pokémon would fit
 * that just as well, the clue also gives its evolution stage, generation and level range.
 * Deterministic from the seed, so a round only has to store its target.
 */
export function buildClue(data: LocationData, target: Pokemon, seed: number, candidates: readonly Pokemon[]): Clue {
  const all = spotsOf(data, target.id);
  const sample = all.length <= MAX_SHOWN ? all : shuffle(all, mulberry32(seed ^ 0x2545f491)).slice(0, MAX_SHOWN);
  const spots = [...sample].sort((a, b) => REGION_ORDER.indexOf(a.region) - REGION_ORDER.indexOf(b.region) || a.name.localeCompare(b.name));
  const rivals = candidates.some((c) => c.id !== target.id && matches(data, spots, target.types, null, c));
  const extras: Extras | null = rivals
    ? { stage: target.evoStage, generation: target.generation, ...rangeAt(spots, spots.map((s) => s.loc)) }
    : null;
  return { types: target.types, spots, more: all.length - spots.length, extras };
}

/** Does `guess` fit everything the clue shows? The target always does. */
export function fits(data: LocationData, clue: Clue, guess: Pokemon): boolean {
  return matches(data, clue.spots, clue.types, clue.extras, guess);
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

/** Regions that have places to explore, in game order. */
export function regionsOf(data: LocationData): string[] {
  const present = new Set(Object.values(data.locations).map((l) => l[1]));
  return REGION_ORDER.filter((r) => present.has(r));
}

/** Places of a region with a guessable number of Pokémon, with that number. */
export function mapsFor(data: LocationData, region: string): { loc: number; count: number }[] {
  const counts = new Map<number, number>();
  for (const list of Object.values(data.pokemon)) for (const e of list) counts.set(e[0], (counts.get(e[0]) ?? 0) + 1);
  return Object.entries(data.locations)
    .filter(([, l]) => l[1] === region)
    .map(([loc]) => ({ loc: Number(loc), count: counts.get(Number(loc)) ?? 0 }))
    .filter((m) => m.count >= MAP_MIN && m.count <= MAP_MAX);
}

/** A place not visited yet; once all are, the cycle starts over (the current one is avoided). */
export function pickMap(maps: { loc: number }[], visited: readonly number[], rand: () => number, current?: number): number | null {
  const unseen = maps.filter((m) => !visited.includes(m.loc));
  const pool = unseen.length ? unseen : maps.filter((m) => m.loc !== current);
  const list = pool.length ? pool : maps;
  return list.length ? list[Math.floor(rand() * list.length)].loc : null;
}

/** 🟥🟥🟩 style row for share text. */
export const guessRow = (misses: number, won: boolean) => '🟥'.repeat(misses) + (won ? '🟩' : '');
