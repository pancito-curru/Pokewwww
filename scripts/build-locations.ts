/**
 * Builds src/data/locations.json for PokeGPS: where each Pokémon can be found in the wild.
 *
 *   npm run data:locations
 *
 * Reads /pokemon/{id}/encounters (areas and levels per game), groups the areas of the same
 * location together and adds the location's English name and region. Only locations that belong
 * to a region are kept. Output is compact on purpose (it is loaded by the browser):
 *
 *   { locations: { [locId]: [name, region] },
 *     pokemon: { [pokemonId]: [locId, minLevel, maxLevel][] } }
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { API, ROOT, en, ensureCache, getJson, pool } from './fetch-cache';
import pokedex from '../src/data/pokedex.json';

const OUT = path.join(ROOT, 'src', 'data', 'locations.json');

const titleCase = (slug: string) =>
  slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

async function main() {
  await ensureCache();
  const ids = (pokedex as { id: number }[]).map((p) => p.id);

  console.log(`Encounters for ${ids.length} Pokémon…`);
  const enc = await pool(ids, (id) => getJson<any[]>(`${API}/pokemon/${id}/encounters`));

  const areaUrls = [...new Set(enc.flatMap((list) => list.map((e) => e.location_area.url as string)))];
  console.log(`Location areas: ${areaUrls.length}`);
  const areas = await pool(areaUrls, (u) => getJson<any>(u));
  const areaToLocUrl = new Map<string, string>(areas.map((a, i) => [areaUrls[i], a.location.url]));

  const locUrls = [...new Set(areaToLocUrl.values())];
  console.log(`Locations: ${locUrls.length}`);
  const locs = await pool(locUrls, (u) => getJson<any>(u));
  const locInfo = new Map<string, { id: number; name: string; region: string }>();
  for (const l of locs) {
    if (!l.region) continue; // not part of any region (event, abstract places)
    locInfo.set(`${API}/location/${l.id}/`, {
      id: l.id,
      name: en(l.names)?.name ?? titleCase(l.name),
      region: titleCase(l.region.name),
    });
  }

  const locations: Record<number, [string, string]> = {};
  const pokemon: Record<number, [number, number, number][]> = {};

  enc.forEach((list, i) => {
    const byLoc = new Map<number, { min: number; max: number }>();
    for (const e of list) {
      const li = locInfo.get(areaToLocUrl.get(e.location_area.url)!);
      if (!li) continue;
      for (const v of e.version_details)
        for (const d of v.encounter_details) {
          const cur = byLoc.get(li.id) ?? { min: 999, max: 0 };
          cur.min = Math.min(cur.min, d.min_level);
          cur.max = Math.max(cur.max, d.max_level);
          byLoc.set(li.id, cur);
          locations[li.id] = [li.name, li.region];
        }
    }
    if (byLoc.size)
      pokemon[ids[i]] = [...byLoc.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([loc, v]) => [loc, v.min, v.max]);
  });

  await writeFile(OUT, JSON.stringify({ locations, pokemon }));
  console.log(
    `Wrote ${path.relative(ROOT, OUT)}: ${Object.keys(pokemon).length} Pokémon with encounters, ${Object.keys(locations).length} locations`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
