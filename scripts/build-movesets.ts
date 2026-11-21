/**
 * Builds src/data/movesets.json for the Moveset game: for each Pokémon, 6 moves (with the level
 * or method it learns them by, and the game those levels come from)
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
/** Level it's learned at (0 = on evolution), or the learn method: machine, tutor, egg… */
type Learn = number | string;

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

  const sets: Record<number, { vg: number | null; moves: [string, Learn][] }> = {};
  const skipped: string[] = [];
  const vg = (d: Detail) => idFromUrl(d.version_group.url);

  /** How a move is learned: its level in the chosen game, else the method from the newest game. */
  const learnOf = (m: MoveRef, chosenVg: number | null): Learn => {
    const inVg = m.version_group_details.filter((d) => vg(d) === chosenVg);
    const lvl = inVg.filter((d) => d.move_learn_method.name === 'level-up').map((d) => d.level_learned_at);
    if (lvl.length) return Math.min(...lvl);
    const newest = (inVg.length ? inVg : m.version_group_details).reduce((a, b) => (vg(b) > vg(a) ? b : a));
    return newest.move_learn_method.name === 'level-up' ? newest.level_learned_at : newest.move_learn_method.name;
  };

  forms.forEach((f: any, i) => {
    const moves = f.moves as MoveRef[];

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
    const byName = new Map(moves.map((m) => [m.move.name, m]));
    sets[ids[i]] = {
      vg: chosenVg,
      moves: spread(candidates, MOVES_PER_POKEMON).map((name) => [name, learnOf(byName.get(name)!, chosenVg)]),
    };
  });

  // Display names for the games the levels come from ("Scarlet & Violet").
  const vgIds = [...new Set(Object.values(sets).map((s) => s.vg).filter((v): v is number => v !== null))];
  const games: Record<number, string> = {};
  await pool(vgIds, async (id) => {
    const group = await getJson(`${API}/version-group/${id}`);
    const names = await Promise.all(
      group.versions.map(async (v: { url: string }) => en((await getJson(v.url)).names)?.name ?? group.name),
    );
    games[id] = names.join(' & ');
  });

  const used = [...new Set(Object.values(sets).flatMap((s) => s.moves.map(([m]) => m)))].sort();
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

  await writeFile(OUT, JSON.stringify({ moves, games, sets }));
  console.log(`Wrote ${Object.keys(sets).length} movesets (${used.length} moves) → ${path.relative(ROOT, OUT)}`);
  console.log(`Skipped ${skipped.length} with fewer than ${MIN_MOVES} moves: ${skipped.join(', ')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
