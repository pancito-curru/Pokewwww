import { describe, expect, it } from 'vitest';
import { score, keyboardState, rowsFor, availableLengths, isValidName, shareGrid } from './wordle';
import { getPool } from '../data';

/** G = correct, Y = present, . = absent */
const s = (g: string, a: string) =>
  score(g, a)
    .map((x) => ({ correct: 'G', present: 'Y', absent: '.' })[x])
    .join('');

describe('score', () => {
  it.each([
    ['PIKACHU', 'PIKACHU', 'GGGGGGG'],
    ['ZZZZZ', 'ABRAS', '.....'],
    ['ALLOY', 'LOYAL', 'YYYYY'],
    ['SPEED', 'ABIDE', '..Y.Y'],
    // correct letters claim their copy before present ones are counted
    ['BBBBB', 'ABBEY', '.GG..'],
    ['HOLLO', 'HELLO', 'G.GGG'],
    // answer has two L: both guessed Ls are present, nothing else
    ['LLAMA', 'HELLO', 'YY...'],
    // answer has three E: two are exact, the one left over goes to the first unmatched E
    ['EEVEE', 'GEESE', 'YG..G'],
  ])('%s vs %s → %s', (guess, answer, expected) => expect(s(guess, answer)).toBe(expected));
});

describe('keyboardState', () => {
  it('keeps the best state per letter', () => {
    const k = keyboardState(['AXXXX', 'XAXXX'], 'XAZZZ');
    expect(k.A).toBe('correct');
    expect(k.X).toBe('correct');
    expect(k.Z).toBeUndefined();
  });
  it('does not downgrade a correct letter', () => {
    const k = keyboardState(['ABCDE', 'BAXXX'], 'ABZZZ');
    expect(k.A).toBe('correct');
    expect(k.B).toBe('correct');
    expect(k.C).toBe('absent');
  });
});

describe('helpers', () => {
  it('rows clamp to 6–8', () => {
    expect(rowsFor(4)).toBe(6);
    expect(rowsFor(6)).toBe(7);
    expect(rowsFor(11)).toBe(8);
  });
  it('offers lengths with enough answers', () => {
    expect(availableLengths(getPool()).map((l) => l.length)).toEqual([4, 5, 6, 7, 8, 9, 10, 11]);
    expect(availableLengths(getPool({ generations: [1] })).map((l) => l.length)).toEqual([5, 6, 7, 8, 9, 10]);
  });
  it('validates names as letters', () => {
    expect(isValidName('PIKACHU')).toBe(true);
    expect(isValidName('MRMIME')).toBe(true);
    expect(isValidName('PIKACHO')).toBe(false);
  });
  it('share grid', () => expect(shareGrid(['ABCDE', 'EDCBA'], 'EDCBA')).toBe('🟨🟨🟩🟨🟨\n🟩🟩🟩🟩🟩'));
});
