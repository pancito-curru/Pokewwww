import { describe, expect, it } from 'vitest';
import { compare, shareText, type ColumnKey, type CellResult } from './compare';
import { byId } from '../data';

const P = (id: number) => byId.get(id)!;
const asMap = (id: number, target: number) =>
  Object.fromEntries(compare(P(id), P(target)).map((c) => [c.key, c.result])) as Record<ColumnKey, CellResult>;

describe('compare', () => {
  it('everything matches against itself', () => {
    expect(compare(P(6), P(6)).every((c) => c.result === 'match')).toBe(true);
  });

  it('types: exact slot match', () => {
    // Gengar (Ghost/Poison) vs Bulbasaur (Grass/Poison)
    const r = asMap(94, 1);
    expect(r.type1).toBe('miss');
    expect(r.type2).toBe('match');
  });

  it('types: right type in the other slot is partial', () => {
    // Nidoking (Poison/Ground) vs Bulbasaur (Grass/Poison)
    const r = asMap(34, 1);
    expect(r.type1).toBe('partial');
    expect(r.type2).toBe('miss');
  });

  it('types: two single-type Pokémon match on the empty second slot', () => {
    // Pikachu vs Raichu: both pure Electric
    expect(asMap(25, 26).type2).toBe('match');
  });

  it('numeric columns point toward the target', () => {
    // Pikachu (0.4 m, 6 kg, Gen 1) vs Raichu (0.8 m, 30 kg, Gen 1)
    const r = asMap(25, 26);
    expect(r.height).toBe('higher');
    expect(r.weight).toBe('higher');
    expect(r.generation).toBe('match');
    expect(asMap(26, 25).height).toBe('lower');
    // Pikachu (Gen 1) guessed for Lugia (Gen 2)
    expect(asMap(25, 249).generation).toBe('higher');
  });

  it('evolution stage and class', () => {
    // Charmander (stage 1, regular) vs Mewtwo (stage 1, legendary)
    const r = asMap(4, 150);
    expect(r.evoStage).toBe('match');
    expect(r.category).toBe('miss');
  });
});

describe('shareText', () => {
  it('renders one emoji row per guess without naming the target', () => {
    const text = shareText({ title: 'Test', guesses: [P(25), P(6)], target: P(6), won: true, hintsUsed: 1 });
    const lines = text.split('\n');
    expect(lines[0]).toBe('Test · 2 guesses · 1 hint');
    expect(lines).toHaveLength(3);
    expect(lines[2]).toBe('🟩'.repeat(9));
    expect(text).not.toMatch(/charizard/i);
  });
  it('marks losses with X', () => {
    expect(shareText({ title: 'T', guesses: [P(25)], target: P(6), won: false, hintsUsed: 0 }).split('\n')[0]).toBe('T · X');
  });
});
