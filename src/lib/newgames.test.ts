import { describe, expect, it } from 'vitest';
import { evaluate, letterOf, lettersNeeded, maskName, MAX_MISSES } from './hangman';
import { guessRow, learnLabel, movesShown, START_SHOWN, MAX_GUESSES } from './moveset';
import { emptyStats, recordResult } from './stats';
import movesetsJson from '../data/movesets.json';
import { byId } from '../data';
import type { MovesetData } from './moveset';

const movesets = movesetsJson as unknown as MovesetData;

describe('hangman', () => {
  it('maps characters to guessable letters', () => {
    expect(letterOf('é')).toBe('E');
    expect(letterOf('m')).toBe('M');
    expect(letterOf('♀')).toBeNull();
    expect(letterOf('2')).toBeNull();
    expect(letterOf(' ')).toBeNull();
  });
  it('needs each distinct letter once', () => expect([...lettersNeeded('Mr. Mime')].sort()).toEqual(['E', 'I', 'M', 'R']));
  it('masks letters but shows punctuation and symbols', () => {
    const m = maskName('Nidoran♀', ['N']);
    // Both n's show (case-insensitive), ♀ is always shown.
    expect(m.map((s) => (s.hidden ? '_' : s.ch)).join('')).toBe('N_____n♀');
    expect(maskName('Porygon2', [])[7]).toEqual({ ch: '2', hidden: false });
    expect(maskName('Flabébé', ['E']).filter((s) => !s.hidden).map((s) => s.ch)).toEqual(['é', 'é']);
  });
  it('wins when every letter is found', () => {
    expect(evaluate('Mew', ['M', 'E', 'W'])).toMatchObject({ solved: true, lost: false, misses: [] });
  });
  it(`loses after ${MAX_MISSES} wrong letters`, () => {
    const s = evaluate('Mew', ['A', 'B', 'C', 'D', 'F', 'G']);
    expect(s).toMatchObject({ solved: false, lost: true });
    expect(s.misses).toHaveLength(6);
    expect(evaluate('Mew', ['A', 'B', 'C', 'D', 'F']).lost).toBe(false);
  });
});

describe('moveset', () => {
  it('reveals one more move per miss, all at the end', () => {
    expect(movesShown(6, 0, false)).toBe(START_SHOWN);
    expect(movesShown(6, 3, false)).toBe(START_SHOWN + 3);
    expect(movesShown(6, 9, false)).toBe(6);
    expect(movesShown(6, 0, true)).toBe(6);
    // The last guess always sees every move.
    expect(movesShown(6, MAX_GUESSES - 1, false)).toBe(6);
  });
  it('share row', () => expect(guessRow(2, true)).toBe('🟥🟥🟩'));
  it('has data for nearly every Pokémon, with move info for every slug', () => {
    const ids = Object.keys(movesets.sets).map(Number);
    expect(ids.length).toBeGreaterThan(1000);
    expect(ids.every((id) => byId.has(id))).toBe(true);
    for (const set of Object.values(movesets.sets)) {
      expect(set.moves.length).toBeGreaterThanOrEqual(3);
      for (const [m, learn] of set.moves) {
        expect(movesets.moves).toHaveProperty(m);
        expect(['number', 'string']).toContain(typeof learn);
      }
      if (set.vg !== null) expect(movesets.games).toHaveProperty(String(set.vg));
    }
  });
  it('labels how a move is learned', () => {
    expect(learnLabel(12)).toBe('Lv. 12');
    expect(learnLabel(0)).toBe('Evolution');
    expect(learnLabel('machine')).toBe('TM');
    expect(learnLabel('egg')).toBe('Egg');
    expect(learnLabel('some-method')).toBe('Some method');
  });
});

describe('recordResult', () => {
  it('builds daily streaks only on consecutive days', () => {
    let s = recordResult(emptyStats(), { daily: true, won: true, bucket: 2, date: '2026-11-20' });
    s = recordResult(s, { daily: true, won: true, bucket: 1, date: '2026-11-21' });
    expect(s).toMatchObject({ played: 2, wins: 2, streak: 2, maxStreak: 2, distribution: { 1: 1, 2: 1 } });
    s = recordResult(s, { daily: true, won: true, bucket: 1, date: '2026-11-23' });
    expect(s.streak).toBe(1);
  });
  it('resets the streak on a loss', () =>
    expect(recordResult({ ...emptyStats(), streak: 4, maxStreak: 4 }, { daily: false, won: false, bucket: 0 }).streak).toBe(0));
});
