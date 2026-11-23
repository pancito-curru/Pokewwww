import { dailySeed, mulberry32, pick } from './rng';
import { normalize } from './normalize';
import type { Lang } from './i18n';

/** Contents of items.json (see scripts/build-items.ts). */
export interface ItemData {
  pockets: string[];
  categories: [string, number][];
  items: [number, string, string, string, number, string][];
}

export interface Item {
  id: number;
  /** PokeAPI slug; also the sprite's file name. */
  slug: string;
  name: string;
  /** Spanish name when it differs from the English one. */
  nameEs: string;
  category: string;
  /** poke-balls, medicine, battle, misc, mail, berries or key. */
  pocket: string;
  /** Short English effect, '' when unknown. */
  effect: string;
}

export function parseItems(data: ItemData): Item[] {
  return data.items.map(([id, slug, name, nameEs, cat, effect]) => ({
    id,
    slug,
    name,
    nameEs,
    category: data.categories[cat][0],
    pocket: data.pockets[data.categories[cat][1]],
    effect,
  }));
}

/** Wrong guesses allowed. */
export const MAX_GUESSES = 5;

/** The name shown in a language (Spanish falls back to the English name). */
export const itemName = (it: Item, lang: Lang) => (lang === 'es' && it.nameEs ? it.nameEs : it.name);

/** Pockets whose items make a fair daily: key items and mail are only offered in unlimited. */
export const DAILY_POCKETS: readonly string[] = ['pokeballs', 'medicine', 'battle', 'misc', 'berries'];

/** Within the "misc" pocket only these categories are well known enough for a daily. */
const DAILY_MISC: ReadonlySet<string> = new Set([
  'Held items',
  'Evolution',
  'Type enhancement',
  'Choice',
  'Plates',
  'Mega Stones',
  'Jewels',
  'Memories',
  'Bad held items',
  'Scarves',
  'Training',
  'Effort training',
  'Collectibles',
  'Spelunking',
  'Mulch',
  'Tera Shard',
]);

const isDaily = (i: Item) =>
  DAILY_POCKETS.includes(i.pocket) && (i.pocket !== 'misc' || DAILY_MISC.has(i.category)) && i.category !== 'Miracle shooter';

export const POCKETS = ['pokeballs', 'medicine', 'battle', 'berries', 'misc', 'key', 'mail'] as const;

const idsOf = (items: readonly Item[], pockets: readonly string[]) =>
  items
    .filter((i) => pockets.includes(i.pocket))
    .map((i) => i.id)
    .sort((a, b) => a - b); // sorted so the same seed picks the same item everywhere

/** Items the daily can ask about. */
export const dailyPool = (items: readonly Item[]) =>
  items
    .filter(isDaily)
    .map((i) => i.id)
    .sort((a, b) => a - b);

/** Items an unlimited round can ask about; no pockets chosen = every pocket. */
export const poolFor = (items: readonly Item[], pockets: readonly string[]) => idsOf(items, pockets.length ? pockets : POCKETS);

/** Items matching what the player has typed, best first; names in either language match. */
export function searchItems(items: readonly Item[], query: string, exclude: ReadonlySet<number>, limit = 8): Item[] {
  const q = normalize(query);
  if (!q) return [];
  const scored: [number, Item][] = [];
  for (const it of items) {
    if (exclude.has(it.id)) continue;
    const keys = [normalize(it.name), ...(it.nameEs ? [normalize(it.nameEs)] : [])];
    let best = 0;
    for (const k of keys) {
      if (k === q) best = Math.max(best, 4);
      else if (k.startsWith(q)) best = Math.max(best, 3);
      else if (k.includes(q)) best = Math.max(best, 1);
    }
    if (best) scored.push([best, it]);
  }
  return scored
    .sort((a, b) => b[0] - a[0] || a[1].name.length - b[1].name.length || a[1].name.localeCompare(b[1].name))
    .slice(0, limit)
    .map((s) => s[1]);
}

/** The item a typed name means, exactly (either language), or undefined. */
export function findItem(items: readonly Item[], input: string): Item | undefined {
  const q = normalize(input);
  return q ? items.find((i) => normalize(i.name) === q || (i.nameEs && normalize(i.nameEs) === q)) : undefined;
}

/** Hints unlocked by wrong guesses, in order. */
export type HintKey = 'category' | 'length' | 'effect' | 'letter';
export const HINT_ORDER: HintKey[] = ['category', 'length', 'effect', 'letter'];

/** Hints available after `misses` wrong guesses (the effect is skipped for items without one). */
export function hintsFor(item: Item, misses: number): HintKey[] {
  return HINT_ORDER.slice(0, misses).filter((h) => h !== 'effect' || item.effect);
}

/** "5 + 4": the letters in each word of a name. */
export function letterCounts(name: string): number[] {
  return name
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, '').length)
    .filter((n) => n > 0);
}

/** The effect text with any mention of the item's name hidden. */
export function redactEffect(item: Item): string {
  let out = item.effect;
  const words = [item.name, ...item.name.split(/[\s\-]+/).filter((w) => w.length >= 4)];
  for (const w of words) out = out.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '_____');
  return out;
}

/** Today's item, or a random one: same pick for the same seed and pool. */
export function pickItem(pool: readonly number[], seed: number): number {
  return pick(pool, mulberry32(seed));
}

export const dailyItemSeed = (date?: Date) => dailySeed('item', date);

/** 🟥🟥🟩 style row for share text. */
export const guessRow = (misses: number, won: boolean) => '🟥'.repeat(misses) + (won ? '🟩' : '');
