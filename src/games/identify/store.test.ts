import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { createIdentifyStore, dailyTarget } from './store';
import { judge, summarize, runKey, attemptEmoji } from '../../lib/identify';
import { byId } from '../../data';

describe('judge', () => {
  const item = { id: 25, wrong: [], result: null };
  it('accepts the right answer', () => expect(judge(item, 25).outcome).toBe('correct'));
  it('counts wrong answers and misses on the third', () => {
    let r = judge(item, 1);
    expect(r.outcome).toBe('wrong');
    r = judge(r.item, 2);
    expect(r.outcome).toBe('wrong');
    r = judge(r.item, 3);
    expect(r.outcome).toBe('missed');
    expect(r.item.result).toBe('missed');
  });
  it('ignores a repeated wrong guess', () => expect(judge({ ...item, wrong: [1] }, 1).outcome).toBe('repeat'));
});

describe('helpers', () => {
  it('summarizes a run', () =>
    expect(
      summarize([
        { id: 1, wrong: [], result: 'correct' },
        { id: 2, wrong: [5], result: 'correct' },
        { id: 3, wrong: [5, 6, 7], result: 'missed' },
        { id: 4, wrong: [], result: 'skipped' },
        { id: 5, wrong: [], result: null },
      ]),
    ).toEqual({ correct: 2, missed: 1, skipped: 1, firstTry: 1 }));
  it('run keys ignore generation order', () => expect(runKey([3, 1], 2)).toBe(runKey([1, 3], 2)));
  it('attempt emoji', () => expect(attemptEmoji(2, true)).toBe('❌❌✅'));
  it('daily target is stable per kind and day, and differs between kinds', () => {
    const d = new Date(2026, 10, 21);
    expect(dailyTarget('cry', d)).toBe(dailyTarget('cry', d));
    expect(byId.has(dailyTarget('silhouette', d))).toBe(true);
  });
});

describe('identify store', () => {
  let store: ReturnType<typeof createIdentifyStore>;
  const s = () => store.getState();
  beforeEach(() => {
    store = createIdentifyStore('silhouette');
  });
  afterEach(() => vi.useRealTimers());

  it('daily: wins on the right answer and records stats', () => {
    s().openDaily();
    const target = s().daily!.item.id;
    const wrong = target === 1 ? 2 : 1;
    expect(s().guessDaily(wrong)).toBe('wrong');
    expect(s().guessDaily(target)).toBe('correct');
    expect(s().dailyStats).toMatchObject({ played: 1, wins: 1, streak: 1, distribution: { 2: 1 } });
    expect(s().guessDaily(target)).toBe('repeat');
  });

  it('daily: loses after three wrong answers', () => {
    s().openDaily();
    const wrongIds = [1, 2, 3, 4].filter((id) => id !== s().daily!.item.id).slice(0, 3);
    wrongIds.forEach((id) => s().guessDaily(id));
    expect(s().daily!.item.result).toBe('missed');
    expect(s().dailyStats).toMatchObject({ played: 1, wins: 0, streak: 0 });
  });

  it('run: walks through the pool, scoring correct answers', () => {
    s().setSettings({ generations: [1], minutes: 1 });
    s().startRun();
    const run = () => s().run!;
    expect(run().order).toHaveLength(151);
    const first = run().items[0].id;
    expect(s().guessRun(first)).toBe('correct');
    expect(run().revealing).toBe(true);
    expect(s().guessRun(first)).toBe('repeat'); // locked while revealing
    s().nextRun();
    expect(run().items).toHaveLength(2);
    expect(run().items[1].id).toBe(run().order[1]);
    s().skipRun();
    s().nextRun();
    s().endRun();
    expect(run().status).toBe('ended');
    expect(summarize(run().items)).toMatchObject({ correct: 1, skipped: 1 });
    expect(run().items).toHaveLength(2); // the unanswered third item is dropped
    expect(s().best[runKey([1], 1)].correct).toBe(1);
    expect(run().newBest).toBe(true);
  });

  it('run: stops accepting guesses once time is up', () => {
    vi.useFakeTimers();
    s().setSettings({ generations: [1], minutes: 1 });
    s().startRun();
    vi.advanceTimersByTime(61_000);
    expect(s().guessRun(s().run!.items[0].id)).toBe('repeat');
    expect(s().run!.status).toBe('ended');
  });

  it('run: ends when the pool runs out', () => {
    s().setSettings({ generations: [1], minutes: 5 });
    s().startRun();
    for (let i = 0; i < 151; i++) {
      s().skipRun();
      s().nextRun();
    }
    expect(s().run!.status).toBe('ended');
    expect(s().run!.items).toHaveLength(151);
  });
});
