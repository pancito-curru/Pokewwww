import { beforeEach, describe, expect, it } from 'vitest';
import { useExploreStore } from './exploreStore';

const s = () => useExploreStore.getState();
const reset = () =>
  useExploreStore.setState({ region: null, map: null, visited: {}, stats: { maps: 0, pokemon: 0, perRegion: {} } });

describe('explore store', () => {
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
