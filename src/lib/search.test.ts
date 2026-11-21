import { describe, expect, it } from 'vitest';
import { searchPokemon } from './search';

const names = (q: string, exclude?: Set<number>) => searchPokemon(q, exclude).map((p) => p.name);

describe('searchPokemon', () => {
  it('returns nothing for empty input', () => expect(names('  ')).toEqual([]));
  it('ranks prefix matches first, in dex order', () => {
    expect(names('char')).toEqual([
      'Charmander', 'Charmeleon', 'Charizard', 'Charjabug', 'Charcadet', // prefix
      'Chimchar', 'Pecharunt', // substring
    ]);
  });
  it('falls back to substring matches after prefixes', () => {
    // No Pokémon starts with "saur", so all results are substring matches in dex order.
    expect(names('saur')).toEqual(['Bulbasaur', 'Ivysaur', 'Venusaur']);
    // Prefix beats substring: "pi" → Pidgey (#16) first, Pikachu included.
    const r = names('pi');
    expect(r[0]).toBe('Pidgey');
    expect(r).toContain('Pikachu');
  });
  it('ignores punctuation', () => expect(names('mr. m')[0]).toBe('Mr. Mime'));
  it('matches aliases', () => expect(names('mister')).toContain('Mr. Mime'));
  it('excludes ids', () => expect(names('pikach', new Set([25]))).toEqual([]));
  it('limits results', () => expect(searchPokemon('a').length).toBe(8));
});
