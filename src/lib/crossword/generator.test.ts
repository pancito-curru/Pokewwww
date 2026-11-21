import { describe, expect, it } from 'vitest';
import { generateCrossword, placementCells, type Crossword } from './generator';
import { buildClues, clueFor } from './clues';
import { byId, getPool } from '../../data';
import { mulberry32 } from '../rng';

/** Every run of 2+ letters in a row/column must be exactly one placed word. */
function assertValid(cw: Crossword) {
  const { cells, placements, width, height } = cw;
  // Letters match the answers.
  for (const pl of placements) {
    placementCells(pl).forEach(([r, c], i) => expect(cells[r][c]).toBe(pl.answer[i]));
  }
  // No stray words.
  const starts = new Set(placements.map((p) => `${p.dir}:${p.row},${p.col}:${p.answer.length}`));
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; ) {
      if (!cells[r][c]) { c++; continue; }
      const s = c;
      while (c < width && cells[r][c]) c++;
      if (c - s >= 2) expect(starts.has(`across:${r},${s}:${c - s}`), `stray across at ${r},${s}`).toBe(true);
    }
  }
  for (let c = 0; c < width; c++) {
    for (let r = 0; r < height; ) {
      if (!cells[r][c]) { r++; continue; }
      const s = r;
      while (r < height && cells[r][c]) r++;
      if (r - s >= 2) expect(starts.has(`down:${s},${c}:${r - s}`), `stray down at ${s},${c}`).toBe(true);
    }
  }
  // Connected: every word shares a cell with another.
  const cover = new Map<string, number>();
  for (const pl of placements) for (const [r, c] of placementCells(pl)) cover.set(`${r},${c}`, (cover.get(`${r},${c}`) ?? 0) + 1);
  for (const pl of placements) expect(placementCells(pl).some(([r, c]) => cover.get(`${r},${c}`)! > 1)).toBe(true);
}

describe('generateCrossword', () => {
  const pool = getPool();

  it.each([
    [8, 11],
    [12, 13],
    [18, 15],
  ])('builds a valid %i-word grid no wider or taller than %i', (words, maxSize) => {
    for (const seed of [1, 42, 2026]) {
      const cw = generateCrossword(pool, { words, maxSize, seed });
      assertValid(cw);
      expect(cw.width).toBeLessThanOrEqual(maxSize);
      expect(cw.height).toBeLessThanOrEqual(maxSize);
      expect(cw.placements.length).toBeGreaterThanOrEqual(words - 1);
    }
  });

  it('is deterministic for a seed', () => {
    const a = generateCrossword(pool, { words: 12, maxSize: 13, seed: 7 });
    const b = generateCrossword(pool, { words: 12, maxSize: 13, seed: 7 });
    expect(a).toEqual(b);
  });

  it('works with a small single-generation pool', () => {
    const cw = generateCrossword(getPool({ generations: [7] }), { words: 8, maxSize: 11, seed: 3 });
    assertValid(cw);
    expect(cw.placements.length).toBeGreaterThanOrEqual(6);
  });

  it('numbers clues in reading order and never repeats a Pokémon', () => {
    const cw = generateCrossword(pool, { words: 12, maxSize: 13, seed: 99 });
    const ids = cw.placements.map((p) => p.pokemonId);
    expect(new Set(ids).size).toBe(ids.length);
    const nums = [...new Set(cw.placements.map((p) => p.number))].sort((a, b) => a - b);
    expect(nums[0]).toBe(1);
    expect(nums).toEqual(Array.from({ length: nums.length }, (_, i) => i + 1));
  });
});

describe('clues', () => {
  const rand = mulberry32(1);
  it('easy clues give types, generation and length', () => {
    expect(clueFor(byId.get(6)!, 'easy', rand)).toBe('Fire/Flying · Gen 1 · Flame Pokémon (9)');
  });
  it('hard clues never contain the answer', () => {
    for (const id of [25, 122, 150, 448, 658]) {
      const p = byId.get(id)!;
      expect(clueFor(p, 'hard', rand).toLowerCase()).not.toContain(p.name.toLowerCase());
    }
  });
  it('fills every clue', () => {
    const cw = buildClues(generateCrossword(getPool(), { words: 8, maxSize: 11, seed: 5 }), 'normal', 5);
    expect(cw.placements.every((p) => p.clue.length > 4)).toBe(true);
  });
});
