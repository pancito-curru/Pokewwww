import { beforeEach, describe, expect, it } from 'vitest';
import { MAX_WRONG } from '../../lib/gps';
import { todayKey } from '../../lib/rng';
import { emptyStats } from '../../lib/stats';
import { useGpsStore } from './store';

const s = () => useGpsStore.getState();
const reset = () =>
  useGpsStore.setState({
    mode: 'daily',
    daily: null,
    dailyStats: emptyStats(),
    region: null,
    map: null,
    visited: {},
    stats: { maps: 0, pokemon: 0, perRegion: {} },
  });

describe('daily', () => {
  beforeEach(reset);

  it('creates today’s place once and keeps it', () => {
    s().ensureDaily(10, 'Kanto', 3);
    expect(s().daily).toMatchObject({ loc: 10, region: 'Kanto', total: 3, key: todayKey(), status: 'playing' });
    s().guessDaily(25, true);
    s().ensureDaily(99, 'Johto', 5); // same day: ignored
    expect(s().daily!.loc).toBe(10);
    expect(s().daily!.found).toEqual([25]);
  });

  it('replaces a place from another day', () => {
    s().ensureDaily(10, 'Kanto', 3);
    useGpsStore.setState({ daily: { ...s().daily!, key: '2000-01-01' } });
    s().ensureDaily(11, 'Johto', 4);
    expect(s().daily).toMatchObject({ loc: 11, key: todayKey(), found: [] });
  });

  it('completing it records a win, with the wrong guesses as the bucket', () => {
    s().ensureDaily(10, 'Kanto', 2);
    s().guessDaily(1, false);
    s().guessDaily(25, true);
    expect(s().guessDaily(25, true)).toBe(false);
    expect(s().guessDaily(16, true)).toBe(true);
    expect(s().daily!.status).toBe('done');
    expect(s().dailyStats).toMatchObject({ played: 1, wins: 1, streak: 1 });
    expect(s().dailyStats.distribution[1]).toBe(1);
    expect(s().guessDaily(5, true)).toBe(false); // map is over
    expect(s().dailyStats.played).toBe(1);
  });

  it('running out of tries records a loss', () => {
    s().ensureDaily(10, 'Kanto', 5);
    s().guessDaily(25, true);
    for (let i = 0; i < MAX_WRONG; i++) s().guessDaily(100 + i, false);
    expect(s().daily!.status).toBe('lost');
    expect(s().dailyStats).toMatchObject({ played: 1, wins: 0, streak: 0 });
    expect(s().guessDaily(16, true)).toBe(false);
  });

  it('giving up records a loss once', () => {
    s().ensureDaily(10, 'Kanto', 3);
    s().giveUpDaily();
    s().giveUpDaily();
    expect(s().daily!.status).toBe('gaveUp');
    expect(s().dailyStats).toMatchObject({ played: 1, wins: 0, streak: 0 });
  });

  it('does not touch the unlimited stats', () => {
    s().ensureDaily(10, 'Kanto', 1);
    s().guessDaily(25, true);
    expect(s().stats.maps).toBe(0);
  });
});

describe('unlimited', () => {
  beforeEach(reset);

  it('completes a map when every Pokémon is found and counts it', () => {
    s().start('Kanto', 10, 2);
    expect(s().guess(25, true)).toBe(true);
    expect(s().map!.status).toBe('playing');
    expect(s().guess(25, true)).toBe(false); // repeat ignored
    expect(s().guess(16, true)).toBe(true);
    expect(s().map!.status).toBe('done');
    expect(s().stats).toEqual({ maps: 1, pokemon: 2, perRegion: { Kanto: 1 } });
    expect(s().guess(1, true)).toBe(false); // map is over
  });

  it('keeps wrong guesses without penalty and ignores repeats', () => {
    s().start('Kanto', 10, 3);
    expect(s().guess(1, false)).toBe(true);
    expect(s().guess(1, false)).toBe(false);
    expect(s().map!.wrong).toEqual([1]);
    expect(s().map!.status).toBe('playing');
  });

  it('running out of tries ends the map without counting it', () => {
    s().start('Kanto', 10, 4);
    for (let i = 0; i < MAX_WRONG; i++) s().guess(100 + i, false);
    expect(s().map!.status).toBe('lost');
    expect(s().stats.maps).toBe(0);
    expect(s().guess(25, true)).toBe(false);
  });

  it('giving up ends the map without counting it', () => {
    s().start('Johto', 5, 4);
    s().guess(152, true);
    s().giveUp();
    expect(s().map!.status).toBe('gaveUp');
    expect(s().stats.maps).toBe(0);
  });

  it('remembers visited places per region and can start over', () => {
    s().start('Kanto', 1, 3);
    s().start('Kanto', 2, 3);
    s().start('Johto', 7, 3);
    expect(s().visited).toEqual({ Kanto: [1, 2], Johto: [7] });
    s().start('Kanto', 3, 3, true);
    expect(s().visited.Kanto).toEqual([3]);
  });

  it('leaving the region clears the current map', () => {
    s().start('Kanto', 1, 3);
    s().setRegion(null);
    expect(s().map).toBeNull();
    expect(s().region).toBeNull();
  });
});
