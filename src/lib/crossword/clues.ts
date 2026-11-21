import { byId, type Pokemon } from '../../data';
import { mulberry32 } from '../rng';
import type { Crossword } from './generator';

export type ClueDifficulty = 'easy' | 'normal' | 'hard';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const types = (p: Pokemon) => p.types.map(cap).join('/');

/** Hide any mention of the answer that the dex text still contains. */
function redact(text: string, p: Pokemon): string {
  const parts = [p.name, ...p.name.split(/[\s.\-:]+/).filter((w) => w.length >= 4)];
  let out = text;
  for (const part of parts) {
    const esc = part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(esc, 'gi'), '_____');
  }
  return out;
}

export function clueFor(p: Pokemon, difficulty: ClueDifficulty, rand: () => number): string {
  const len = `(${p.letters.length})`;
  if (difficulty === 'easy') return `${types(p)} · Gen ${p.generation} · ${p.genus} ${len}`;
  if (difficulty === 'hard') {
    const flavor = p.flavor ? redact(p.flavor, p) : '';
    return `${flavor || `${p.genus} from ${p.region}`} ${len}`;
  }
  const prev = p.evolvesFrom != null ? byId.get(p.evolvesFrom) : undefined;
  const options = [
    `${types(p)}-type ${p.genus}`,
    `${p.genus} first found in ${p.region}`,
    ...(prev ? [`Evolves from ${prev.name}`] : []),
  ];
  return `${options[Math.floor(rand() * options.length)]} ${len}`;
}

/** Fill in the clue text for every placement. */
export function buildClues(cw: Crossword, difficulty: ClueDifficulty, seed: number): Crossword {
  const rand = mulberry32(seed ^ 0x9e3779b9);
  return {
    ...cw,
    placements: cw.placements.map((pl) => ({ ...pl, clue: clueFor(byId.get(pl.pokemonId)!, difficulty, rand) })),
  };
}
