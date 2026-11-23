import { describe, expect, it } from 'vitest';
import { POKEDEX, getPool } from '../data';
import { spriteUrl } from '../data/sprites';
import { BOARD_SIZE, MAX_MISSES, buildBoard, evaluate, isShinyCandidate, pickRow, roundSeed } from './shiny';
import { dailySeed, todayKey } from './rng';

describe('buildBoard', () => {
  const pool = POKEDEX;
  it('has 300 distinct Pokémon, exactly one of them the target', () => {
    const board = buildBoard(25, 123, pool);
    expect(board).toHaveLength(BOARD_SIZE);
    expect(new Set(board).size).toBe(BOARD_SIZE);
    expect(board.filter((id) => id === 25)).toHaveLength(1);
  });
  it('is the same for the same seed and differs for another one', () => {
    expect(buildBoard(25, 7, pool)).toEqual(buildBoard(25, 7, pool));
    expect(buildBoard(25, 7, pool)).not.toEqual(buildBoard(25, 8, pool));
  });
  it('does not always put the target in the same spot', () => {
    const spots = new Set(Array.from({ length: 30 }, (_, s) => buildBoard(25, s, pool).indexOf(25)));
    expect(spots.size).toBeGreaterThan(10);
  });
  it('shrinks to a small pool and still contains the target', () => {
    const gen1 = getPool({ generations: [1] });
    const board = buildBoard(25, 1, gen1);
    expect(board).toHaveLength(gen1.length);
    expect(board).toContain(25);
    expect(board.every((id) => gen1.some((p) => p.id === id))).toBe(true);
  });
  it('never uses a Pokémon whose shiny looks identical (Minior)', () => {
    expect(isShinyCandidate(774)).toBe(false);
    for (let s = 0; s < 20; s++) expect(buildBoard(25, s, pool)).not.toContain(774);
  });
});

describe('evaluate', () => {
  it('counts misses and wins on the target', () => {
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
