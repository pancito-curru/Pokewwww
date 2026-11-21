export type PokeType =
  | 'normal' | 'fire' | 'water' | 'grass' | 'electric' | 'ice' | 'fighting' | 'poison'
  | 'ground' | 'flying' | 'psychic' | 'bug' | 'rock' | 'ghost' | 'dragon' | 'dark'
  | 'steel' | 'fairy';

export type Region =
  | 'Kanto' | 'Johto' | 'Hoenn' | 'Sinnoh' | 'Unova' | 'Kalos' | 'Alola' | 'Galar' | 'Paldea';

export type Category = 'regular' | 'legendary' | 'mythical' | 'baby';

export interface Pokemon {
  id: number;
  name: string;
  /** PokéSprite slug, or null when PokéSprite has no Gen 8 sprite (Gen 9). See `spriteUrl`. */
  slug: string | null;
  norm: string;
  aliases: string[];
  letters: string;
  types: PokeType[];
  generation: number;
  region: Region;
  color: string;
  habitat: string | null;
  shape: string | null;
  evoStage: 1 | 2 | 3;
  evolvesFrom: number | null;
  fullyEvolved: boolean;
  height: number;
  weight: number;
  bst: number;
  category: Category;
  eggGroups: string[];
  genus: string;
  flavor: string;
}

export const REGIONS: Record<number, Region> = {
  1: 'Kanto', 2: 'Johto', 3: 'Hoenn', 4: 'Sinnoh', 5: 'Unova',
  6: 'Kalos', 7: 'Alola', 8: 'Galar', 9: 'Paldea',
};
