/**
 * Builds src/data/movesets.json for the Moveset game: for each Pokémon, 6 moves
 * ordered from common (vague hint) to rare (telling hint), plus display info per move.
 *
 *   npm run data:moves
 *
 * Reuses the cached /pokemon responses from `npm run data` and fetches /move details.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { API, ROOT, en, ensureCache, getJson, idFromUrl, pool } from './fetch-cache';
import pokedex from '../src/data/pokedex.json';

const OUT = path.join(ROOT, 'src', 'data', 'movesets.json');
const MOVES_PER_POKEMON = 6;
/** Fewer distinct moves than this and the Pokémon is left out (Ditto, Smeargle, Unown…). */
const MIN_MOVES = 3;
/** A version group needs this many level-up moves to be used as "current" moves. */
const MIN_LEVEL_UP = 4;

interface Detail {
  level_learned_at: number;
  move_learn_method: { name: string };
  version_group: { url: string };
}
interface MoveRef {
  move: { name: string; url: string };
  version_group_details: Detail[];
}

/** Evenly spread picks from a list ordered common → rare, always ending on the rarest. */
export function spread<T>(items: T[], n: number): T[] {
  if (items.length <= n) return items;
  return Array.from({ length: n }, (_, i) => items[Math.round((i * (items.length - 1)) / (n - 1))]);
}

async function main() {
  await ensureCache();
  const ids = (pokedex as { id: number }[]).map((p) => p.id);

  console.log(`Loading ${ids.length} Pokémon (cached)…`);
  const species = await pool(ids, (id) => getJson(`${API}/pokemon-species/${id}`));
  const forms = await pool(species, (s: any) => {
    const def = s.varieties.find((v: any) => v.is_default) ?? s.varieties[0];
    return getJson(def.pokemon.url);
  });

  // How many Pokémon can learn each move (any game, any method): lower = more telling.
  const learners = new Map<string, number>();
  for (const f of forms) for (const m of f.moves as MoveRef[]) learners.set(m.move.name, (learners.get(m.move.name) ?? 0) + 1);

  const sets: Record<number, string[]> = {};
  const skipped: string[] = [];
  forms.forEach((f: any, i) => {
    const moves = f.moves as MoveRef[];
    const vg = (d: Detail) => idFromUrl(d.version_group.url);

    // Most recent version group in which it still learns a real level-up set.
    const levelUpByVg = new Map<number, Set<string>>();
    for (const m of moves)
      for (const d of m.version_group_details)
        if (d.move_learn_method.name === 'level-up')
          levelUpByVg.set(vg(d), (levelUpByVg.get(vg(d)) ?? new Set()).add(m.move.name));
    const vgs = [...levelUpByVg.entries()].filter(([, s]) => s.size >= MIN_LEVEL_UP).map(([v]) => v);
    const chosenVg = vgs.length ? Math.max(...vgs) : null;

    let candidates = chosenVg ? [...levelUpByVg.get(chosenVg)!] : [];
    if (candidates.length < MOVES_PER_POKEMON) {
      // Top up with anything else it can learn, rarest first so the extras are informative.
      const extra = moves.map((m) => m.move.name).filter((n) => !candidates.includes(n));
      extra.sort((a, b) => learners.get(a)! - learners.get(b)!);
      candidates = [...candidates, ...extra.slice(0, MOVES_PER_POKEMON - candidates.length)];
    }
    if (candidates.length < MIN_MOVES) {
      skipped.push(`#${ids[i]} ${f.name}`);
      return;
    }
    candidates.sort((a, b) => learners.get(b)! - learners.get(a)! || a.localeCompare(b));
    sets[ids[i]] = spread(candidates, MOVES_PER_POKEMON);
  });

  const used = [...new Set(Object.values(sets).flat())].sort();
  console.log(`Fetching ${used.length} moves…`);
  const details = await pool(used, (name) => getJson(`${API}/move/${name}`));
  const moves: Record<string, { name: string; type: string; cls: string }> = {};
  details.forEach((d: any, i) => {
    moves[used[i]] = {
      name: en(d.names)?.name ?? used[i],
      type: d.type.name,
      cls: d.damage_class?.name ?? 'status',
    };
  });

  await writeFile(OUT, JSON.stringify({ moves, sets }));
  console.log(`Wrote ${Object.keys(sets).length} movesets (${used.length} moves) → ${path.relative(ROOT, OUT)}`);
  console.log(`Skipped ${skipped.length} with fewer than ${MIN_MOVES} moves: ${skipped.join(', ')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
