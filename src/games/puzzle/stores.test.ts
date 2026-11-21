import { beforeEach, describe, expect, it } from 'vitest';
import { createPuzzleStore } from './createPuzzleStore';
import { useHangmanStore, useMovesetStore } from './stores';
import { byId } from '../../data';
import { lettersNeeded } from '../../lib/hangman';
import { MAX_GUESSES } from '../../lib/moveset';

const reset = (store: typeof useMovesetStore | typeof useHangmanStore) =>
  store.setState({ mode: 'daily', daily: null, unlimited: null, generations: [] });

describe('moveset store', () => {
  const s = () => useMovesetStore.getState();
  beforeEach(() => reset(useMovesetStore));

  it('wins on the right Pokémon and records the guess count', () => {
    s().ensureRound();
    const target = s().daily!.targetId;
    const wrong = target === 1 ? 4 : 1;
    expect(s().guess(wrong)).toBe(true);
    expect(s().guess(wrong)).toBe(false); // repeat ignored
    expect(s().guess(target)).toBe(true);
    expect(s().daily!.status).toBe('won');
    expect(s().stats.daily.distribution[2]).toBeGreaterThanOrEqual(1);
  });

  it(`loses after ${MAX_GUESSES} wrong guesses`, () => {
    s().ensureRound();
    const target = s().daily!.targetId;
    [1, 4, 7, 10, 13, 16].filter((id) => id !== target).slice(0, MAX_GUESSES).forEach((id) => s().guess(id));
    expect(s().daily!.status).toBe('lost');
  });

  it('respects the eligible filter and generation filter in unlimited', () => {
    useMovesetStore.setState({ generations: [1] });
    s().newUnlimited((id) => id !== 25);
    const t = s().unlimited!.targetId;
    expect(byId.get(t)!.generation).toBe(1);
    expect(t).not.toBe(25);
  });

  it('counts abandoning a started unlimited round as a loss', () => {
    s().newUnlimited();
    const before = s().stats.unlimited.played;
    s().guess(s().unlimited!.targetId === 1 ? 4 : 1);
    s().newUnlimited();
    expect(s().stats.unlimited.played).toBe(before + 1);
  });
});

describe('hangman store', () => {
  const s = () => useHangmanStore.getState();
  beforeEach(() => reset(useHangmanStore));

  it('wins once every letter is found', () => {
    s().ensureRound();
    const name = byId.get(s().daily!.targetId)!.name;
    for (const l of lettersNeeded(name)) s().guess(l);
    expect(s().daily!.status).toBe('won');
  });

  it('loses after six wrong letters and ignores repeats', () => {
    s().ensureRound();
    const needed = lettersNeeded(byId.get(s().daily!.targetId)!.name);
    const wrong = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter((l) => !needed.has(l));
    s().guess(wrong[0]);
    expect(s().guess(wrong[0])).toBe(false);
    wrong.slice(1, 6).forEach((l) => s().guess(l));
    expect(s().daily!.status).toBe('lost');
    expect(s().guess(wrong[7])).toBe(false);
  });

  it('give up ends the round as a loss', () => {
    const store = createPuzzleStore<string>({ name: 'test', addGuess: () => null, bucket: () => 0 });
    store.getState().ensureRound();
    store.getState().giveUp();
    expect(store.getState().daily!.status).toBe('lost');
    expect(store.getState().stats.daily.played).toBe(1);
  });
});
