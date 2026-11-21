import { describe, expect, it } from 'vitest';
import { resolveGuess, perGenStats, scopeKey, formatClock, typoDistance, findNearMiss } from './timed';
import { getPool } from '../data';

const gen1 = new Set(getPool({ generations: [1] }).map((p) => p.id));
const none = new Set<number>();

describe('resolveGuess', () => {
  it('matches a plain name', () => expect(resolveGuess('Pikachu', gen1, none)).toEqual({ kind: 'match', id: 25 }));
  it('matches with odd punctuation and aliases', () => {
    expect(resolveGuess('mr mime', gen1, none)).toEqual({ kind: 'match', id: 122 });
    expect(resolveGuess('farfetched', gen1, none)).toEqual({ kind: 'match', id: 83 });
  });
  it('returns none for partial input', () => expect(resolveGuess('pika', gen1, none)).toEqual({ kind: 'none' }));
  it('flags out-of-scope Pokémon', () =>
    expect(resolveGuess('Lugia', gen1, none)).toEqual({ kind: 'outOfScope', id: 249 }));
  it('flags already-found Pokémon', () =>
    expect(resolveGuess('pikachu', gen1, new Set([25]))).toEqual({ kind: 'already', id: 25 }));

  it('treats a prefix of another unfound name as ambiguous', () => {
    expect(resolveGuess('mew', gen1, none)).toEqual({ kind: 'ambiguous', id: 151 });
    expect(resolveGuess('kabuto', gen1, none)).toEqual({ kind: 'ambiguous', id: 140 });
  });
  it('stays quiet about an already-found prefix while a longer name is unfound', () => {
    expect(resolveGuess('mew', gen1, new Set([151]))).toEqual({ kind: 'none' });
    expect(resolveGuess('mew', gen1, new Set([150, 151]))).toEqual({ kind: 'already', id: 151 });
  });
  it('is no longer ambiguous once the longer name is found', () => {
    expect(resolveGuess('mew', gen1, new Set([150]))).toEqual({ kind: 'match', id: 151 });
  });
  it('only considers longer names inside the scope', () => {
    // Porygon2 / Porygon-Z are Gen 2 / Gen 4, so Porygon is unambiguous in a Gen 1 quiz.
    expect(resolveGuess('porygon', gen1, none)).toEqual({ kind: 'match', id: 137 });
    const all = new Set(getPool().map((p) => p.id));
    expect(resolveGuess('porygon', all, none)).toEqual({ kind: 'ambiguous', id: 137 });
  });
});

describe('typoDistance', () => {
  it.each([
    ['charizard', 'charizard', 0],
    ['charzard', 'charizard', 1], // missing letter
    ['charizzard', 'charizard', 1], // extra letter
    ['charixard', 'charizard', 1], // wrong letter
    ['chraizard', 'charizard', 1], // swapped neighbours
    ['chrzard', 'charizard', 2],
  ])('%s vs %s → %i', (a, b, d) => expect(typoDistance(a, b, 2)).toBe(d));
  it('stops early past the limit', () => expect(typoDistance('abcdef', 'uvwxyz', 1)).toBe(2));
});

describe('findNearMiss', () => {
  it('finds an unfound Pokémon one letter off', () => {
    expect(findNearMiss('Charzard', gen1, none)).toEqual({ id: 6, found: false });
    expect(findNearMiss('gyrados', gen1, none)).toEqual({ id: 130, found: false });
    expect(findNearMiss('bulbasuar', gen1, none)).toEqual({ id: 1, found: false });
  });
  it('says when the close name was already found', () =>
    expect(findNearMiss('pikachuu', gen1, new Set([25]))).toEqual({ id: 25, found: true }));
  it('stays quiet while the input is still the start of a name', () =>
    expect(findNearMiss('pikach', gen1, none)).toBeNull());
  it('ignores short inputs, exact names, and two-letter mistakes', () => {
    expect(findNearMiss('mwe', gen1, none)).toBeNull();
    expect(findNearMiss('pikachu', gen1, none)).toBeNull();
    expect(findNearMiss('chrzard', gen1, none)).toBeNull();
  });
  it('ignores Pokémon outside the quiz', () => expect(findNearMiss('lugai', gen1, none)).toBeNull());
});

describe('perGenStats', () => {
  it('counts found per generation', () => {
    const scope = getPool({ generations: [1, 2] }).map((p) => p.id);
    expect(perGenStats(scope, new Set([1, 2, 152]))).toEqual([
      { gen: 1, region: 'Kanto', found: 2, total: 151 },
      { gen: 2, region: 'Johto', found: 1, total: 100 },
    ]);
  });
});

describe('helpers', () => {
  it('scopeKey is order-independent', () => {
    expect(scopeKey([3, 1], 10)).toBe(scopeKey([1, 3], 10));
    expect(scopeKey([], null)).toBe('all|untimed');
    expect(scopeKey([1], 5, true)).toBe('1|5|easy');
    expect(scopeKey([1], 5, true)).not.toBe(scopeKey([1], 5));
  });
  it('formats clocks', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(65_000)).toBe('1:05');
    expect(formatClock(599_001)).toBe('10:00');
    expect(formatClock(3_725_000)).toBe('1:02:05');
  });
});
