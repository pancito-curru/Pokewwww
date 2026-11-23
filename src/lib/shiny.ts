import { mulberry32, dailySeed } from './rng';

/** Sprites on the board: 299 regular copies of one Pokémon and its shiny. */
export const BOARD_SIZE = 300;
/** Wrong picks allowed; the next one ends the round. */
export const MAX_MISSES = 5;

/** Pokémon whose shiny sprite is pixel-identical to the regular one (checked against PokéSprite): Minior. */
const NO_VISIBLE_SHINY: ReadonlySet<number> = new Set([774]);

/** Whether a Pokémon can be the round's Pokémon: its shiny must look different. */
export const isShinyCandidate = (id: number) => !NO_VISIBLE_SHINY.has(id);

/** The seed a round was created with (daily rounds are keyed by their date, unlimited ones by the seed). */
export const roundSeed = (r: { mode: 'daily' | 'unlimited'; key: string }) =>
  r.mode === 'daily' ? dailySeed('shiny', new Date(`${r.key}T12:00:00`)) : Number(r.key);

/** Where the shiny sits on the board (0-based). Deterministic, so a round never has to store it. */
export function shinyIndex(seed: number, size = BOARD_SIZE): number {
  return Math.floor(mulberry32(seed ^ 0x5bd1e995)() * size);
}

export interface ShinyState {
  misses: number;
  won: boolean;
  lost: boolean;
}

/** `picks` are the board positions the player clicked, in order. */
export function evaluate(picks: readonly number[], shiny: number): ShinyState {
  const won = picks.includes(shiny);
  const misses = picks.filter((i) => i !== shiny).length;
  return { misses, won, lost: !won && misses >= MAX_MISSES };
}

/** 🟥🟥✨ style row for share text. */
export const pickRow = (misses: number, won: boolean) => '🟥'.repeat(misses) + (won ? '✨' : '');
