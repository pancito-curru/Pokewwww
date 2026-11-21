import { beforeEach, describe, expect, it } from 'vitest';
import { isOver, useCrossStore } from './store';

const store = () => useCrossStore.getState();
const round = () => store().unlimited!;

describe('crossword store: ending a puzzle', () => {
  beforeEach(() => {
    store().setSettings({ mode: 'unlimited', size: 'small', difficulty: 'normal', generations: [] });
    store().newUnlimited();
  });

  it('reveals every answer and closes the puzzle without counting a solve', () => {
    const solvedBefore = store().stats.unlimited.solved;
    // Type a letter that is certainly wrong for that square (the puzzle is random).
    const cells = round().puzzle.cells.flat();
    const idx = cells.findIndex((c) => c !== null);
    store().setEntry(idx, cells[idx] === 'Z' ? 'Q' : 'Z');
    store().endPuzzle();

    const r = round();
    expect(isOver(r)).toBe(true);
    expect(r.solvedAt).toBeNull();
    expect(r.endedAt).toBeTypeOf('number');
    expect(r.entries).toEqual(r.puzzle.cells.flat().map((c) => c ?? ''));
    expect(r.revealed.length).toBe(r.puzzle.cells.flat().filter((c) => c !== null).length);
    expect(store().stats.unlimited.solved).toBe(solvedBefore);
  });

  it('ignores input after the puzzle has ended', () => {
    store().endPuzzle();
    const before = round().entries;
    const idx = round().puzzle.cells.flat().findIndex((c) => c !== null);
    store().setEntry(idx, before[idx] === 'Q' ? 'X' : 'Q');
    store().reset();
    expect(round().entries).toEqual(before);
  });

  it('starts a fresh puzzle from setup once the old one has ended', () => {
    const oldKey = round().key;
    store().endPuzzle();
    store().toSetup();
    store().play();
    expect(round().key).not.toBe(oldKey);
    expect(isOver(round())).toBe(false);
  });

  it('resumes an unfinished puzzle from setup', () => {
    const key = round().key;
    store().toSetup();
    store().play();
    expect(round().key).toBe(key);
  });
});
