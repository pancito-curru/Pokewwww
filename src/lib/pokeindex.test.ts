import { describe, expect, it } from 'vitest';
import { HINT_SILHOUETTE, MAX_GUESSES, direction, formatDex, guessRow, hintsFor } from './pokeindex';

describe('hintsFor', () => {
  it('gives nothing at first and unlocks one hint at a time', () => {
    expect(hintsFor(0)).toEqual([]);
    expect(hintsFor(1)).toEqual(['generation']);
    expect(hintsFor(2)).toEqual(['generation', 'types']);
    expect(hintsFor(3)).toEqual(['generation', 'types', 'silhouette']);
  });
  it('keeps the silhouette hidden until the third miss', () => {
    for (let m = 0; m < HINT_SILHOUETTE; m++) expect(hintsFor(m)).not.toContain('silhouette');
    expect(hintsFor(MAX_GUESSES)).toContain('silhouette');
  });
});

describe('formatDex', () => {
  it('pads to three digits and leaves longer numbers alone', () => {
    expect(formatDex(1)).toBe('#001');
    expect(formatDex(25)).toBe('#025');
    expect(formatDex(151)).toBe('#151');
    expect(formatDex(1025)).toBe('#1025');
  });
});

describe('direction', () => {
  it('says which way the target lies from a wrong guess', () => {
    expect(direction(25, 150)).toBe('higher');
    expect(direction(150, 25)).toBe('lower');
    expect(direction(25, 25)).toBe('same');
  });
});

describe('guessRow', () => {
  it('draws misses then the win', () => {
    expect(guessRow(2, true)).toBe('🟥🟥🟩');
    expect(guessRow(MAX_GUESSES, false)).toBe('🟥'.repeat(MAX_GUESSES));
  });
});
