import { describe, expect, it } from 'vitest';
import { POKEDEX, byId } from '../data';
import raw from '../data/locations.json';
import {
  MAP_MAX,
  MAP_MIN,
  MAX_SHOWN,
  buildClue,
  fits,
  guessRow,
  hasEncounters,
  levelsAt,
  mapsFor,
  membersOf,
  pickMap,
  regionsOf,
  roundSeed,
  spotsOf,
  type LocationData,
} from './gps';
import { dailySeed, mulberry32, todayKey } from './rng';

const data = raw as unknown as LocationData;
const candidates = POKEDEX.filter((p) => hasEncounters(data, p.id));

describe('location data', () => {
  it('covers most of the dex but not Gen 9 (PokeAPI has no Paldea encounters)', () => {
    expect(candidates.length).toBeGreaterThan(800);
    expect(candidates.some((p) => p.generation === 9)).toBe(false);
  });
  it('finds well-known spots', () => {
    const names = spotsOf(data, 129).map((s) => s.name); // Magikarp
    expect(names.length).toBeGreaterThan(5);
    expect(spotsOf(data, 25).some((s) => s.name === 'Viridian Forest')).toBe(true); // Pikachu
    expect(hasEncounters(data, 154)).toBe(false); // Meganium is never wild
  });
  it('has sane level ranges', () => {
    for (const p of candidates.slice(0, 200))
      for (const s of spotsOf(data, p.id)) {
        expect(s.min).toBeGreaterThanOrEqual(1);
        expect(s.max).toBeGreaterThanOrEqual(s.min);
        expect(s.max).toBeLessThanOrEqual(100);
      }
  });
});

describe('buildClue', () => {
  it('is deterministic for a seed', () => {
    const p = byId.get(129)!;
    expect(buildClue(data, p, 7, candidates)).toEqual(buildClue(data, p, 7, candidates));
  });
  it('lists at most MAX_SHOWN places and counts the rest', () => {
    const p = byId.get(129)!;
    const all = spotsOf(data, p.id).length;
    const clue = buildClue(data, p, 1, candidates);
    expect(clue.spots.length).toBe(Math.min(all, MAX_SHOWN));
    expect(clue.spots.length + clue.more).toBe(all);
    expect(new Set(clue.spots.map((s) => s.loc)).size).toBe(clue.spots.length);
  });
  it('always accepts its own target', () => {
    for (const p of candidates) expect(fits(data, buildClue(data, p, 99, candidates), p), p.name).toBe(true);
  });
  it('rejects a Pokémon of another type or without the places', () => {
    const p = byId.get(129)!; // Magikarp, water
    const clue = buildClue(data, p, 5, candidates);
    expect(fits(data, clue, byId.get(25)!)).toBe(false);
    expect(fits(data, clue, byId.get(154)!)).toBe(false); // no encounters at all
  });
  it('adds extras exactly when another Pokémon fits the type and places', () => {
    let withExtras = 0;
    for (const p of candidates) {
      const clue = buildClue(data, p, 12345, candidates);
      const rivals = candidates.filter((c) => c.id !== p.id && fits(data, { ...clue, extras: null }, c));
      expect(!!clue.extras, p.name).toBe(rivals.length > 0);
      if (clue.extras) {
        withExtras++;
        expect(clue.extras.stage).toBe(p.evoStage);
        expect(clue.extras.generation).toBe(p.generation);
        expect(clue.extras.min).toBeLessThanOrEqual(clue.extras.max);
      }
    }
    // The reason the extras exist: a noticeable share of clues is ambiguous.
    expect(withExtras).toBeGreaterThan(candidates.length * 0.05);
  });
  it('extras narrow the accepted answers down', () => {
    for (const p of candidates) {
      const clue = buildClue(data, p, 12345, candidates);
      if (!clue.extras) continue;
      const base = candidates.filter((c) => fits(data, { ...clue, extras: null }, c)).length;
      const withExtras = candidates.filter((c) => fits(data, clue, c)).length;
      expect(withExtras).toBeLessThanOrEqual(base);
      expect(withExtras).toBeLessThanOrEqual(5);
    }
  });
});

describe('maps', () => {
  it('lists regions in game order', () => {
    const r = regionsOf(data);
    expect(r.slice(0, 3)).toEqual(['Kanto', 'Johto', 'Hoenn']);
    expect(r).not.toContain('Paldea');
  });
  it('only offers places with a guessable number of Pokémon', () => {
    for (const region of regionsOf(data)) {
      const maps = mapsFor(data, region);
      expect(maps.length, region).toBeGreaterThan(5);
      for (const m of maps) {
        expect(m.count).toBeGreaterThanOrEqual(MAP_MIN);
        expect(m.count).toBeLessThanOrEqual(MAP_MAX);
        expect(membersOf(data, m.loc)).toHaveLength(m.count);
        expect(data.locations[m.loc][1]).toBe(region);
      }
    }
  });
  it('members of a place all list it, with levels', () => {
    const loc = mapsFor(data, 'Kanto')[0].loc;
    for (const id of membersOf(data, loc)) expect(levelsAt(data, id, loc)).not.toBeNull();
    expect(levelsAt(data, 129, -1)).toBeNull();
  });
  it('picks unseen places first and never loops on the current one', () => {
    const maps = [{ loc: 1 }, { loc: 2 }, { loc: 3 }];
    const rand = mulberry32(3);
    for (let i = 0; i < 20; i++) expect(pickMap(maps, [1, 2], rand)).toBe(3);
    for (let i = 0; i < 20; i++) expect(pickMap(maps, [1, 2, 3], rand, 2)).not.toBe(2);
    expect(pickMap([], [], rand)).toBeNull();
    expect(pickMap([{ loc: 9 }], [9], rand, 9)).toBe(9); // a single place has to repeat
  });
});

describe('helpers', () => {
  it('rebuilds the round seed from its key', () => {
    expect(roundSeed({ mode: 'unlimited', key: '4242' })).toBe(4242);
    expect(roundSeed({ mode: 'daily', key: todayKey() })).toBe(dailySeed('gps'));
  });
  it('draws the share row', () => {
    expect(guessRow(2, true)).toBe('🟥🟥🟩');
    expect(guessRow(6, false)).toBe('🟥🟥🟥🟥🟥🟥');
  });
});
