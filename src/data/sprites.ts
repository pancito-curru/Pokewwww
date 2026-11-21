/** PokéSprite commit the sprites are loaded from. Pinned so URLs never change under a deployed build. */
export const SPRITE_REF = 'c5aaa610ff2acdf7fd8e2dccd181bca8be9fcb3e'; // latest commit (2022-07-22)
export const SPRITE_BASE = `https://cdn.jsdelivr.net/gh/msikma/pokesprite@${SPRITE_REF}`;

/** PokeAPI's sprite repo, used for Pokémon PokéSprite doesn't have (Gen 9). */
const POKEAPI_SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

export function spriteUrl(p: { id: number; slug: string | null }, shiny = false): string {
  if (p.slug) return `${SPRITE_BASE}/pokemon-gen8/${shiny ? 'shiny' : 'regular'}/${p.slug}.png`;
  return `${POKEAPI_SPRITES}/${shiny ? 'shiny/' : ''}${p.id}.png`;
}
