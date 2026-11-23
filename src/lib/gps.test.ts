import { describe, expect, it } from 'vitest';
import { POKEDEX } from '../data';
import raw from '../data/locations.json';
import {
  MAP_MAX,
  MAP_MIN,
  MAX_WRONG,
  REGION_ORDER,
  applyGuess,
  dailyMap,
  levelsAt,
  mapsFor,
  membersOf,
  newMapRound,
  pickMap,
  regionsOf,
  shareRow,
  type LocationData,
} from './gps';
import { mulberry32 } from './rng';

const data = raw as unknown as LocationData;
const idsInDex = new Set(POKEDEX.map((p) => p.id));

describe('location data', () => {
  it('covers most of the dex but not Gen 9 (PokeAPI has no Paldea encounters)', () => {
    const ids = Object.keys(data.pokemon).map(Number);
    expect(ids.length).toBeGreaterThan(800);
    expect(ids.every((id) => idsInDex.has(id))).toBe(true);
    expect(ids.some((id) => POKEDEX.find((p) => p.id === id)!.generation === 9)).toBe(false);
  });
  it('has sane level ranges', () => {
    for (const list of Object.values(data.pokemon).slice(0, 300))
      for (const [loc, min, max] of list) {
        expect(data.locations[loc]).toBeDefined();
        expect(min).toBeGreaterThanOrEqual(1);
        expect(max).toBeGreaterThanOrEqual(min);
        expect(max).toBeLessThanOrEqual(100);
      }
  });
});

describe('maps', () => {
  it('lists regions in game order', () => {
    const r = regionsOf(data);
    expect(r.slice(0, 3)).toEqual(['Kanto', 'Johto', 'Hoenn']);
    expect(r).not.toContain('Paldea');
    expect(REGION_ORDER).toEqual(expect.arrayContaining(r));
  });
  it('only offers places with a guessable number of Pokémon', () => {
    for (const region of regionsOf(data)) {
      const maps = mapsFor(data, region);
      expect(maps.length, region).toBeGreaterThan(5);
      for (const m of maps) {
        expect(m.count).toBeGreaterThanOrEqual(MAP_MIN);
        expect(m.count).toBeLessThanOrEqual(MAP_MAX);
        expect(membersOf(data, m.loc)).toHaveLength(m.count);
        expect(m.region).toBe(region);
      }
    }
  });
  it('mapsFor with no region is the union, sorted by id', () => {
    const all = mapsFor(data);
    const sum = regionsOf(data).reduce((n, r) => n + mapsFor(data, r).length, 0);
    expect(all).toHaveLength(sum);
    expect(all.map((m) => m.loc)).toEqual(all.map((m) => m.loc).sort((a, b) => a - b));
  });
  it('members of a place all list it, with levels', () => {
    const loc = mapsFor(data, 'Kanto')[0].loc;
    for (const id of membersOf(data, loc)) expect(levelsAt(data, id, loc)).not.toBeNull();
    expect(levelsAt(data, 129, -1)).toBeNull();
  });
  it('knows Rock Tunnel', () => {
    const rock = mapsFor(data, 'Kanto').find((m) => data.locations[m.loc][0] === 'Rock Tunnel')!;
    expect(rock.count).toBe(18);
    expect(membersOf(data, rock.loc)).toContain(41); // Zubat
  });
});

describe('dailyMap', () => {
  it('is the same place all day and never Orre', () => {
    const d = new Date('2026-11-23T12:00:00');
    expect(dailyMap(data, d)).toEqual(dailyMap(data, d));
    for (let i = 0; i < 120; i++) {
      const day = new Date(2026, 0, 1 + i, 12);
      const m = dailyMap(data, day);
      expect(m.region).not.toBe('Orre');
      expect(m.count).toBeGreaterThanOrEqual(MAP_MIN);
    }
  });
  it('changes from day to day and spreads over regions', () => {
    const places = new Set<number>();
    const regions = new Set<string>();
    for (let i = 0; i < 120; i++) {
      const m = dailyMap(data, new Date(2026, 0, 1 + i, 12));
      places.add(m.loc);
      regions.add(m.region);
    }
    expect(places.size).toBeGreaterThan(60);
    expect(regions.size).toBeGreaterThanOrEqual(6);
  });
});

describe('applyGuess', () => {
  const map = newMapRound(1, 'Kanto', 2);
  it('records a Pokémon that appears here, and finishes when all are found', () => {
    const a = applyGuess(map, 25, true)!;
    expect(a.found).toEqual([25]);
    expect(a.status).toBe('playing');
    const b = applyGuess(a, 16, true)!;
    expect(b.status).toBe('done');
  });
  it('keeps wrong guesses without ending the map', () => {
    const a = applyGuess(map, 151, false)!;
    expect(a.wrong).toEqual([151]);
    expect(a.status).toBe('playing');
  });
  it(`loses the place at ${MAX_WRONG} wrong guesses, and a last-moment find still wins`, () => {
    let m = newMapRound(1, 'Kanto', 3);
    for (let i = 0; i < MAX_WRONG - 1; i++) m = applyGuess(m, 100 + i, false)!;
    expect(m.status).toBe('playing');
    expect(applyGuess(m, 25, true)!.status).toBe('playing');
    const lost = applyGuess(m, 200, false)!;
    expect(lost.status).toBe('lost');
    expect(applyGuess(lost, 25, true)).toBeNull();
  });
  it('ignores repeats and guesses after the end', () => {
    const a = applyGuess(map, 25, true)!;
    expect(applyGuess(a, 25, true)).toBeNull();
    const w = applyGuess(map, 1, false)!;
    expect(applyGuess(w, 1, false)).toBeNull();
    expect(applyGuess({ ...map, status: 'gaveUp' }, 25, true)).toBeNull();
  });
  it('does not mutate the round it was given', () => {
    applyGuess(map, 25, true);
    expect(map.found).toEqual([]);
  });
});

describe('pickMap', () => {
  it('picks unseen places first and never loops on the current one', () => {
    const maps = [{ loc: 1 }, { loc: 2 }, { loc: 3 }];
    const rand = mulberry32(3);
    for (let i = 0; i < 20; i++) expect(pickMap(maps, [1, 2], rand)).toBe(3);
    for (let i = 0; i < 20; i++) expect(pickMap(maps, [1, 2, 3], rand, 2)).not.toBe(2);
    expect(pickMap([], [], rand)).toBeNull();
    expect(pickMap([{ loc: 9 }], [9], rand, 9)).toBe(9); // a single place has to repeat
  });
});

describe('shareRow', () => {
  it('shows found, missing and wrong guesses', () => {
    expect(shareRow({ ...newMapRound(1, 'Kanto', 4), found: [1, 2], wrong: [9] })).toBe('🟩🟩⬜⬜🟥');
  });
  it('caps the wrong guesses so the row stays short', () => {
    const wrong = Array.from({ length: 40 }, (_, i) => i + 100);
    expect(shareRow({ ...newMapRound(1, 'Kanto', 3), found: [1, 2, 3], wrong })).toBe('🟩🟩🟩' + '🟥'.repeat(10));
  });
});
