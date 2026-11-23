import { describe, expect, it } from 'vitest';
import { POKEDEX } from '../data';
import { spriteUrl } from '../data/sprites';
import { BOARD_SIZE, MAX_MISSES, evaluate, isShinyCandidate, pickRow, roundSeed, shinyIndex } from './shiny';
import { dailySeed, todayKey } from './rng';

describe('shinyIndex', () => {
  it('is always on the board and stable for a seed', () => {
    for (let s = 0; s < 200; s++) {
      const i = shinyIndex(s);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(BOARD_SIZE);
      expect(shinyIndex(s)).toBe(i);
    }
  });
  it('moves around between rounds', () => {
    const spots = new Set(Array.from({ length: 60 }, (_, s) => shinyIndex(s)));
    expect(spots.size).toBeGreaterThan(30);
  });
});

describe('evaluate', () => {
  it('counts misses and wins on the shiny position', () => {
    expect(evaluate([], 25)).toEqual({ misses: 0, won: false, lost: false });
    expect(evaluate([1, 4, 25], 25)).toEqual({ misses: 2, won: true, lost: false });
  });
  it(`loses at ${MAX_MISSES} misses`, () => {
    expect(evaluate([1, 2, 3, 4], 25).lost).toBe(false);
    expect(evaluate([1, 2, 3, 4, 5], 25).lost).toBe(true);
  });
  it('a win on the last allowed pick is still a win', () => {
    expect(evaluate([1, 2, 3, 4, 25], 25)).toMatchObject({ won: true, lost: false });
  });
});

describe('helpers', () => {
  it('rejects Minior, whose shiny looks identical', () => {
    expect(isShinyCandidate(774)).toBe(false);
    expect(isShinyCandidate(25)).toBe(true);
  });
  it('rebuilds a round seed from its key', () => {
    expect(roundSeed({ mode: 'unlimited', key: '12345' })).toBe(12345);
    expect(roundSeed({ mode: 'daily', key: todayKey() })).toBe(dailySeed('shiny'));
  });
  it('draws the share row', () => {
    expect(pickRow(2, true)).toBe('🟥🟥✨');
    expect(pickRow(5, false)).toBe('🟥🟥🟥🟥🟥');
  });
});

describe('shiny sprite urls', () => {
  it('point at the shiny folder, for PokéSprite and PokeAPI sprites alike', () => {
    const pika = POKEDEX.find((p) => p.id === 25)!;
    const gen9 = POKEDEX.find((p) => p.id === 1000)!;
    expect(spriteUrl(pika, true)).toContain('/shiny/');
    expect(spriteUrl(pika)).toContain('/regular/');
    expect(spriteUrl(gen9, true)).toMatch(/\/shiny\/1000\.png$/);
    expect(spriteUrl(gen9)).toMatch(/\/pokemon\/1000\.png$/);
  });
});
