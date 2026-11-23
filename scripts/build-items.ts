/**
 * Builds src/data/items.json for the item-sprite game: every item that has a sprite, with its
 * English and Spanish name, pocket, category and a short English effect.
 *
 *   npm run data:items
 *
 * Left out: machines (TMs/HMs/TRs, their sprite only shows the move type), items in the "unused"
 * category, and every item whose sprite is pixel-identical to another one (Dynamax crystals, species
 * candies, data cards…): those could not be told apart from the picture.
 * Output is compact on purpose (it is loaded by the browser):
 *
 *   { pockets: string[], categories: [name, pocketIdx][],
 *     items: [id, slug, nameEn, nameEs, categoryIdx, effect][] }
 */
import { writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { API, ROOT, en, ensureCache, getJson, pool } from './fetch-cache';

const OUT = path.join(ROOT, 'src', 'data', 'items.json');
const SPRITE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/';

const titleCase = (slug: string) =>
  slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

async function main() {
  await ensureCache();
  const list = await getJson<any>(`${API}/item?limit=3000`);
  console.log(`Items listed: ${list.count}`);
  const details = await pool<any, any>(list.results, (r) => getJson(r.url));

  const catUrls = [...new Set(details.map((d) => d.category.url as string))];
  const cats = await pool(catUrls, (u) => getJson<any>(u));
  const catInfo = new Map<string, any>(cats.map((c) => [c.url ?? `${API}/item-category/${c.id}/`, c]));

  const pockets: string[] = [];
  const categories: [string, number][] = [];
  const catIdx = new Map<string, number>();
  const idxOf = (url: string) => {
    if (catIdx.has(url)) return catIdx.get(url)!;
    const c = catInfo.get(url)!;
    let p = pockets.indexOf(c.pocket.name);
    if (p < 0) p = pockets.push(c.pocket.name) - 1;
    categories.push([en(c.names)?.name ?? titleCase(c.name), p]);
    catIdx.set(url, categories.length - 1);
    return categories.length - 1;
  };

  const seen = new Set<string>();
  let items: [number, string, string, string, number, string][] = [];
  let noSprite = 0;
  let machines = 0;
  for (const d of details) {
    if (!d.sprites?.default) {
      noSprite++;
      continue;
    }
    if (d.category.name === 'all-machines' || d.category.name === 'unused' || /^(tm|hm|tr)\d/.test(d.name)) {
      machines++;
      continue;
    }
    const nameEn: string = en(d.names)?.name ?? titleCase(d.name);
    if (seen.has(nameEn.toLowerCase())) continue; // same item listed twice
    seen.add(nameEn.toLowerCase());
    const es: string = d.names.find((n: any) => n.language.name === 'es')?.name ?? '';
    const effect: string = (en(d.effect_entries) as any)?.short_effect ?? '';
    items.push([d.id, d.name, nameEn, es === nameEn ? '' : es, idxOf(d.category.url), effect.replace(/\s+/g, ' ').trim()]);
  }
  items.sort((a, b) => a[0] - b[0]);

  // Download every sprite once: drop missing ones and every group of identical pictures.
  console.log('Checking sprites…');
  const hashes = await pool(items, async (it) => {
    const res = await fetch(SPRITE + it[1] + '.png');
    return res.ok ? createHash('md5').update(Buffer.from(await res.arrayBuffer())).digest('hex') : null;
  });
  const count = new Map<string, number>();
  for (const h of hashes) if (h) count.set(h, (count.get(h) ?? 0) + 1);
  const before = items.length;
  items = items.filter((_, i) => hashes[i] && count.get(hashes[i]!) === 1);
  console.log(`Dropped ${before - items.length} items with a missing or shared sprite`);

  await writeFile(OUT, JSON.stringify({ pockets, categories, items }));
  console.log(
    `Wrote ${path.relative(ROOT, OUT)}: ${items.length} items (skipped ${noSprite} without sprite, ${machines} machines), ${categories.length} categories, pockets: ${pockets.join(', ')}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
