import { byId, type Pokemon } from '../../data';
import { mulberry32 } from '../rng';
import type { Crossword } from './generator';
import { type TFn } from '../../i18n';

export type ClueDifficulty = 'easy' | 'normal' | 'hard';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const types = (p: Pokemon, t: TFn) => p.types.map((ty) => cap(t(`type.${ty}`))).join('/');

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

export function clueFor(p: Pokemon, difficulty: ClueDifficulty, rand: () => number, t: TFn): string {
  const len = `(${p.letters.length})`;
  if (difficulty === 'easy') return `${types(p, t)} · ${t('filter.gen', { n: p.generation })} · ${p.genus} ${len}`;
  if (difficulty === 'hard') {
    const flavor = p.flavor ? redact(p.flavor, p) : '';
    return `${flavor || t('cw.clue.from', { genus: p.genus, region: p.region })} ${len}`;
  }
  const prev = p.evolvesFrom != null ? byId.get(p.evolvesFrom) : undefined;
  const options = [
    t('cw.clue.typeGenus', { types: types(p, t), genus: p.genus }),
    t('cw.clue.firstFound', { genus: p.genus, region: p.region }),
    ...(prev ? [t('cw.clue.evolves', { name: prev.name })] : []),
  ];
  return `${options[Math.floor(rand() * options.length)]} ${len}`;
}

/** Fill in the clue text for every placement. */
export function buildClues(cw: Crossword, difficulty: ClueDifficulty, seed: number, t: TFn): Crossword {
  const rand = mulberry32(seed ^ 0x9e3779b9);
  return {
    ...cw,
    placements: cw.placements.map((pl) => ({ ...pl, clue: clueFor(byId.get(pl.pokemonId)!, difficulty, rand, t) })),
  };
}
