/**
 * Fetches PokeAPI + PokéSprite data once and writes src/data/pokedex.json.
 * Raw responses are cached in scripts/cache so re-runs are fast and polite
 * (PokeAPI's fair-use policy asks clients to cache).
 *
 *   npm run data            # build everything
 *   npm run data -- --limit 151   # only the first N species (quick test)
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { normalize, toLetters, EXTRA_ALIASES } from '../src/lib/normalize';
import { REGIONS, type Pokemon, type PokeType, type Category } from '../src/data/types';
import { SPRITE_BASE } from '../src/data/sprites';
import { API, ROOT, en, ensureCache, getJson, idFromUrl, pool } from './fetch-cache';

const OUT = path.join(ROOT, 'src', 'data', 'pokedex.json');

const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;


function cleanFlavor(text: string, name: string): string {
  const flat = text.replace(/[\n\f\r­]+/g, ' ').replace(/\s+/g, ' ').trim();
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return flat.replace(new RegExp(escaped, 'gi'), '_____');
}

async function main() {
  await ensureCache();

  console.log('Fetching PokéSprite index…');
  const spriteIndex: Record<string, { slug: { eng: string } }> = await getJson(
    `${SPRITE_BASE}/data/pokemon.json`,
  );
  const slugById = new Map<number, string>();
  for (const [dex, entry] of Object.entries(spriteIndex)) slugById.set(Number(dex), entry.slug.eng);

  console.log('Fetching species list…');
  const list = await getJson<{ results: { url: string }[] }>(`${API}/pokemon-species?limit=2000`);
  const ids = list.results.map((r) => idFromUrl(r.url)).filter((id) => id <= LIMIT).sort((a, b) => a - b);

  console.log(`Fetching ${ids.length} species…`);
  const species = await pool(ids, (id) => getJson(`${API}/pokemon-species/${id}`));

  console.log('Fetching default forms…');
  const forms = await pool(species, (s: any) => {
    const def = s.varieties.find((v: any) => v.is_default) ?? s.varieties[0];
    return getJson(def.pokemon.url);
  });

  const evolvesFrom = new Map<number, number | null>();
  species.forEach((s: any) =>
    evolvesFrom.set(s.id, s.evolves_from_species ? idFromUrl(s.evolves_from_species.url) : null),
  );
  const hasChild = new Set([...evolvesFrom.values()].filter((v): v is number => v != null));
  const stage = (id: number): number => {
    const parent = evolvesFrom.get(id);
    return parent == null || !evolvesFrom.has(parent) ? 1 : 1 + stage(parent);
  };

  const missingSlugs: string[] = [];
  const noSprite: number[] = [];
  const dex: Pokemon[] = species.map((s: any, i) => {
    const p: any = forms[i];
    const name: string = en(s.names)?.name ?? s.name;
    const generation = idFromUrl(s.generation.url);
    // No PokéSprite slug → the app falls back to PokeAPI's sprite by dex number (see src/data/sprites.ts).
    const slug = slugById.get(s.id) ?? null;
    if (!slug) {
      missingSlugs.push(`#${s.id} ${name}`);
      if (!p.sprites?.front_default) noSprite.push(s.id);
    }

    const flavorEntry =
      [...s.flavor_text_entries].reverse().find((f: any) => f.language.name === 'en') ?? null;
    const category: Category = s.is_mythical
      ? 'mythical'
      : s.is_legendary
        ? 'legendary'
        : s.is_baby
          ? 'baby'
          : 'regular';
    const norm = normalize(name);
    const aliases = [...new Set([normalize(s.name), ...(EXTRA_ALIASES[s.id] ?? []).map(normalize)])].filter(
      (a) => a !== norm,
    );

    return {
      id: s.id,
      name,
      slug,
      norm,
      aliases,
      letters: toLetters(name),
      types: p.types
        .sort((a: any, b: any) => a.slot - b.slot)
        .map((t: any) => t.type.name as PokeType),
      generation,
      region: REGIONS[generation],
      color: s.color?.name ?? 'unknown',
      habitat: s.habitat?.name ?? null,
      shape: s.shape?.name ?? null,
      evoStage: Math.min(3, stage(s.id)) as 1 | 2 | 3,
      evolvesFrom: evolvesFrom.get(s.id) ?? null,
      fullyEvolved: !hasChild.has(s.id),
      height: p.height / 10,
      weight: p.weight / 10,
      bst: p.stats.reduce((sum: number, st: any) => sum + st.base_stat, 0),
      category,
      eggGroups: s.egg_groups.map((g: any) => g.name),
      genus: en(s.genera)?.genus ?? '',
      flavor: flavorEntry ? cleanFlavor(flavorEntry.flavor_text, name) : '',
    };
  });

  const broken = [...noSprite, ...dex.filter((p) => p.types.length === 0).map((p) => p.id)];
  if (broken.length) throw new Error(`Entries missing sprite/types: ${broken.join(', ')}`);

  await writeFile(OUT, JSON.stringify(dex));
  console.log(`Wrote ${dex.length} Pokémon → ${path.relative(ROOT, OUT)}`);
  if (missingSlugs.length)
    console.log(`${missingSlugs.length} without a PokéSprite slug (using PokeAPI sprite): ${missingSlugs.slice(0, 5).join(', ')}…`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
