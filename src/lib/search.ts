import { POKEDEX, type Pokemon } from '../data';
import { normalize } from './normalize';

/**
 * Autocomplete ranking: name prefix first, then alias prefix, then substring.
 * Ties keep dex order.
 */
export function searchPokemon(query: string, exclude: ReadonlySet<number> = new Set(), limit = 8): Pokemon[] {
  const q = normalize(query);
  if (!q) return [];
  const ranked: [number, Pokemon][] = [];
  for (const p of POKEDEX) {
    if (exclude.has(p.id)) continue;
    const rank = p.norm.startsWith(q)
      ? 0
      : p.aliases.some((a) => a.startsWith(q))
        ? 1
        : p.norm.includes(q)
          ? 2
          : -1;
    if (rank >= 0) ranked.push([rank, p]);
  }
  ranked.sort((a, b) => a[0] - b[0] || a[1].id - b[1].id);
  return ranked.slice(0, limit).map(([, p]) => p);
}
