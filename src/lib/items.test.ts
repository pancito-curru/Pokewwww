import { describe, expect, it } from 'vitest';
import raw from '../data/items.json';
import {
  DAILY_POCKETS,
  MAX_GUESSES,
  POCKETS,
  dailyPool,
  findItem,
  guessRow,
  hintsFor,
  itemName,
  letterCounts,
  parseItems,
  pickItem,
  poolFor,
  redactEffect,
  searchItems,
  type Item,
  type ItemData,
} from './items';

const items = parseItems(raw as unknown as ItemData);
const named = (name: string) => items.find((i) => i.name === name)!;
const none = new Set<number>();

describe('item data', () => {
  it('has about a thousand items with unique ids, slugs and names', () => {
    expect(items.length).toBeGreaterThan(900);
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    expect(new Set(items.map((i) => i.slug)).size).toBe(items.length);
    expect(new Set(items.map((i) => i.name.toLowerCase())).size).toBe(items.length);
  });
  it('keeps no machines (their sprite only shows a move type)', () => {
    expect(items.some((i) => /^(TM|HM|TR)\d/.test(i.name))).toBe(false);
  });
  it('only uses known pockets', () => {
    for (const i of items) expect(POCKETS as readonly string[]).toContain(i.pocket);
  });
  it('knows famous items, with a Spanish name where it differs', () => {
    expect(named('Poké Ball').pocket).toBe('pokeballs');
    expect(named('Rare Candy').slug).toBe('rare-candy');
    expect(named('Great Ball').nameEs).toBe('Super Ball');
  });
});

describe('pools', () => {
  it('the daily skips key items and mail, unlimited defaults to everything', () => {
    const byId = new Map(items.map((i) => [i.id, i]));
    for (const id of dailyPool(items)) expect(DAILY_POCKETS).toContain(byId.get(id)!.pocket);
    expect(poolFor(items, [])).toHaveLength(items.length);
    expect(poolFor(items, ['key', 'mail']).every((id) => ['key', 'mail'].includes(byId.get(id)!.pocket))).toBe(true);
    expect(dailyPool(items).length).toBeLessThan(items.length);
    // Obscure categories stay out of the daily but can come up in unlimited.
    const cats = new Set(dailyPool(items).map((id) => byId.get(id)!.category));
    for (const c of ['Curry ingredients', 'Sandwich ingredients', 'Species candies', 'Miracle shooter']) expect(cats.has(c), c).toBe(false);
    expect(cats.has('Healing')).toBe(true);
    expect(dailyPool(items).length).toBeGreaterThan(300);
  });
  it('picks the same item for the same seed, sorted pool or not', () => {
    const pool = dailyPool(items);
    expect(pickItem(pool, 42)).toBe(pickItem(pool, 42));
    expect(pool).toEqual([...pool].sort((a, b) => a - b));
  });
});

describe('search', () => {
  it('ranks exact and prefix matches above substrings', () => {
    const r = searchItems(items, 'potion', none);
    expect(r[0].name).toBe('Potion');
    expect(r.length).toBeGreaterThan(1);
  });
  it('ignores accents, case and punctuation, and matches Spanish names', () => {
    expect(searchItems(items, 'POKE ball', none)[0].name).toBe('Poké Ball');
    expect(searchItems(items, 'super ball', none).some((i) => i.name === 'Great Ball')).toBe(true);
  });
  it('skips excluded items and empty queries', () => {
    const potion = named('Potion');
    expect(searchItems(items, 'potion', new Set([potion.id])).some((i) => i.id === potion.id)).toBe(false);
    expect(searchItems(items, '  ', none)).toEqual([]);
  });
  it('finds an exact name in either language', () => {
    expect(findItem(items, 'great ball')?.name).toBe('Great Ball');
    expect(findItem(items, 'Super Ball')?.name).toBe('Great Ball');
    expect(findItem(items, 'not an item')).toBeUndefined();
  });
});

describe('names and hints', () => {
  const ball = named('Great Ball');
  it('shows the Spanish name only in Spanish, and falls back to English', () => {
    expect(itemName(ball, 'es')).toBe('Super Ball');
    expect(itemName(ball, 'en')).toBe('Great Ball');
    const noEs = items.find((i) => !i.nameEs)!;
    expect(itemName(noEs, 'es')).toBe(noEs.name);
  });
  it('counts the letters of each word', () => {
    expect(letterCounts('Rare Candy')).toEqual([4, 5]);
    expect(letterCounts("King's Rock")).toEqual([5, 4]);
    expect(letterCounts('Poké Ball')).toEqual([4, 4]);
  });
  it('unlocks one hint per miss, skipping a missing effect', () => {
    const withEffect: Item = { ...ball, effect: 'Catches Pokémon.' };
    const without: Item = { ...ball, effect: '' };
    expect(hintsFor(withEffect, 0)).toEqual([]);
    expect(hintsFor(withEffect, 1)).toEqual(['category']);
    expect(hintsFor(withEffect, 4)).toEqual(['category', 'length', 'effect', 'letter']);
    expect(hintsFor(without, 4)).toEqual(['category', 'length', 'letter']);
  });
  it('hides the item name inside its effect', () => {
    const it: Item = { ...named('Potion'), effect: 'A Potion heals 20 HP. Super Potion heals more.' };
    expect(redactEffect(it)).toBe('A _____ heals 20 HP. Super _____ heals more.');
  });
  it('draws the share row', () => {
    expect(guessRow(2, true)).toBe('🟥🟥🟩');
    expect(guessRow(MAX_GUESSES, false)).toBe('🟥'.repeat(MAX_GUESSES));
  });
});
