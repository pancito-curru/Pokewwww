import { mulberry32, dailySeed, shuffle } from './rng';

/** Sprites on the board: 299 regular ones and 1 shiny. */
export const BOARD_SIZE = 300;
/** Wrong picks allowed; the next one ends the round. */
export const MAX_MISSES = 5;

/** Pokémon whose shiny sprite is pixel-identical to the regular one (checked against PokéSprite): Minior. */
const NO_VISIBLE_SHINY: ReadonlySet<number> = new Set([774]);

/** Whether a Pokémon can be the shiny (or fill the board): its shiny must look different. */
export const isShinyCandidate = (id: number) => !NO_VISIBLE_SHINY.has(id);

/**
 * The sprites of a round, in display order. Deterministic from the seed, so a round only has to
 * store its target and seed. The board is smaller than `size` if the pool can't fill it.
 */
export function buildBoard(targetId: number, seed: number, pool: readonly { id: number }[], size = BOARD_SIZE): number[] {
  const rand = mulberry32(seed ^ 0x5bd1e995);
  const others = shuffle(
    pool.filter((p) => p.id !== targetId && isShinyCandidate(p.id)),
    rand,
  ).slice(0, size - 1);
  return shuffle([targetId, ...others.map((p) => p.id)], rand);
}

/** The seed a round was created with (daily rounds are keyed by their date, unlimited ones by the seed). */
export const roundSeed = (r: { mode: 'daily' | 'unlimited'; key: string }) =>
  r.mode === 'daily' ? dailySeed('shiny', new Date(`${r.key}T12:00:00`)) : Number(r.key);

export interface ShinyState {
  misses: number;
  won: boolean;
  lost: boolean;
}

/** `picks` are the Pokémon ids the player clicked, in order. */
export function evaluate(picks: readonly number[], targetId: number): ShinyState {
  const won = picks.includes(targetId);
  const misses = picks.filter((id) => id !== targetId).length;
  return { misses, won, lost: !won && misses >= MAX_MISSES };
}

/** 🟥🟥✨ style row for share text. */
export const pickRow = (misses: number, won: boolean) => '🟥'.repeat(misses) + (won ? '✨' : '');
