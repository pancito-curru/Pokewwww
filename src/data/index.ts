import raw from './pokedex.json';
import type { Pokemon } from './types';
import { normalize, isLetterSafe } from '../lib/normalize';

export * from './types';

export const POKEDEX = raw as Pokemon[];

export const byId = new Map<number, Pokemon>(POKEDEX.map((p) => [p.id, p]));

/** normalised name or alias → Pokémon */
export const byNorm = new Map<string, Pokemon>();
for (const p of POKEDEX) {
  byNorm.set(p.norm, p);
  for (const a of p.aliases) if (!byNorm.has(a)) byNorm.set(a, p);
}

export const findByInput = (input: string): Pokemon | undefined => byNorm.get(normalize(input));

export const GENERATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export interface PoolFilter {
  generations?: number[];
  fullyEvolvedOnly?: boolean;
}

export function getPool({ generations, fullyEvolvedOnly }: PoolFilter = {}): Pokemon[] {
  return POKEDEX.filter(
    (p) =>
      (!generations?.length || generations.includes(p.generation)) &&
      (!fullyEvolvedOnly || p.fullyEvolved),
  );
}

/** Letter-game pool grouped by letter count (names containing digits excluded). */
export function byLength(pool: Pokemon[]): Map<number, Pokemon[]> {
  const m = new Map<number, Pokemon[]>();
  for (const p of pool) {
    if (!isLetterSafe(p.name)) continue;
    const list = m.get(p.letters.length) ?? [];
    list.push(p);
    m.set(p.letters.length, list);
  }
  return m;
}
