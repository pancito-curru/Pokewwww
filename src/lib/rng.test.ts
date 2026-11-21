import { describe, expect, it } from 'vitest';
import { mulberry32, dailySeed, shuffle } from './rng';

describe('rng', () => {
  it('is deterministic', () => {
    const a = mulberry32(42), b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it('daily seed differs per mode and day', () => {
    const d = new Date(2026, 10, 20);
    expect(dailySeed('wordle-5', d)).toBe(dailySeed('wordle-5', d));
    expect(dailySeed('wordle-5', d)).not.toBe(dailySeed('wordle-6', d));
    expect(dailySeed('wordle-5', d)).not.toBe(dailySeed('wordle-5', new Date(2026, 10, 21)));
  });
  it('shuffle keeps elements', () => {
    expect(shuffle([1, 2, 3, 4, 5], mulberry32(1)).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
