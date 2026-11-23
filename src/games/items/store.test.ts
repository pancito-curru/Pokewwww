import { beforeEach, describe, expect, it } from 'vitest';
import { MAX_GUESSES } from '../../lib/items';
import { useItemStore } from './store';

const s = () => useItemStore.getState();
const POOL = [10, 20, 30, 40, 50, 60, 70, 80];
const blank = { played: 0, wins: 0, streak: 0, maxStreak: 0, distribution: {} };
const reset = () =>
  useItemStore.setState({ mode: 'daily', pockets: [], daily: null, unlimited: null, stats: { daily: { ...blank }, unlimited: { ...blank } } });
const wrong = (target: number, n: number) => [1, 2, 3, 4, 5, 6, 7].filter((i) => i !== target).slice(0, n);

describe('item store', () => {
  beforeEach(reset);

  it('picks from the given pool, the same item all day', () => {
    s().ensureRound(POOL);
    const t = s().daily!.targetId;
    expect(POOL).toContain(t);
    useItemStore.setState({ daily: null });
    s().ensureRound(POOL);
    expect(s().daily!.targetId).toBe(t);
  });

  it('does nothing with an empty pool', () => {
    s().ensureRound([]);
    expect(s().daily).toBeNull();
  });

  it('wins on the target, ignores repeats, and records the guess count', () => {
    s().ensureRound(POOL);
    const t = s().daily!.targetId;
    const [w] = wrong(t, 1);
    expect(s().guess(w)).toBe(true);
    expect(s().guess(w)).toBe(false);
    expect(s().guess(t)).toBe(true);
    expect(s().daily!.status).toBe('won');
    expect(s().stats.daily.distribution[2]).toBe(1);
    expect(s().guess(99)).toBe(false); // round is over
  });

  it(`loses after ${MAX_GUESSES} wrong guesses`, () => {
    s().ensureRound(POOL);
    wrong(s().daily!.targetId, MAX_GUESSES).forEach((id) => s().guess(id));
    expect(s().daily!.status).toBe('lost');
    expect(s().stats.daily.played).toBe(1);
    expect(s().stats.daily.wins).toBe(0);
  });

  it('unlimited keeps the chosen pockets and counts an abandoned round as a loss', () => {
    useItemStore.setState({ pockets: ['berries'] });
    s().newUnlimited(POOL);
    expect(s().unlimited!.pockets).toEqual(['berries']);
    expect(s().mode).toBe('unlimited');
    s().guess(wrong(s().unlimited!.targetId, 1)[0]);
    s().newUnlimited(POOL);
    expect(s().stats.unlimited.played).toBe(1);
    expect(s().stats.unlimited.wins).toBe(0);
  });

  it('giving up loses the round', () => {
    s().ensureRound(POOL);
    s().giveUp();
    expect(s().daily!.status).toBe('lost');
  });
});
