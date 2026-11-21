import { describe, expect, it } from 'vitest';
import { normalize, toLetters, isLetterSafe } from './normalize';
import { findByInput, byLength, getPool } from '../data';

describe('normalize', () => {
  it.each([
    ['Mr. Mime', 'mrmime'],
    ['Farfetch’d', 'farfetchd'],
    ["Farfetch'd", 'farfetchd'],
    ['Nidoran♀', 'nidoranf'],
    ['Nidoran♂', 'nidoranm'],
    ['Type: Null', 'typenull'],
    ['Ho-Oh', 'hooh'],
    ['Flabébé', 'flabebe'],
    ['Porygon-Z', 'porygonz'],
    ['Jangmo-o', 'jangmoo'],
    ['Tapu Koko', 'tapukoko'],
    ['  PIKACHU ', 'pikachu'],
  ])('%s → %s', (input, out) => expect(normalize(input)).toBe(out));

  it('letters strips digits', () => {
    expect(toLetters('Porygon2')).toBe('PORYGON');
    expect(isLetterSafe('Porygon2')).toBe(false);
    expect(isLetterSafe('Porygon-Z')).toBe(true);
  });
});

describe('findByInput', () => {
  it.each([
    ['mr mime', 122],
    ['Mister Mime', 122],
    ['farfetched', 83],
    ['nidoran female', 29],
    ['nidoranm', 32],
    ['type null', 772],
    ['flabebe', 669],
    ['porygon2', 233],
    ['Mime Jr.', 439],
    ['pecharunt', 1025],
  ])('%s → #%i', (input, id) => expect(findByInput(input)?.id).toBe(id));

  it('rejects partial names', () => expect(findByInput('pika')).toBeUndefined());
});

describe('pools', () => {
  it('has the full dex', () => expect(getPool()).toHaveLength(1025));
  it('filters by generation', () => expect(getPool({ generations: [1] })).toHaveLength(151));
  it('groups letter-safe names by length', () => {
    const m = byLength(getPool());
    expect(m.get(3)?.map((p) => p.name)).toContain('Mew');
    expect([...m.values()].flat().some((p) => p.name === 'Porygon2')).toBe(false);
  });
});
