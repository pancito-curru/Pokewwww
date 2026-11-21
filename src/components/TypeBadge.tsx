import type { PokeType } from '../data';

// Full class names so Tailwind's content scanner picks them up.
const BG: Record<PokeType, string> = {
  normal: 'bg-type-normal', fire: 'bg-type-fire', water: 'bg-type-water', grass: 'bg-type-grass',
  electric: 'bg-type-electric', ice: 'bg-type-ice', fighting: 'bg-type-fighting', poison: 'bg-type-poison',
  ground: 'bg-type-ground', flying: 'bg-type-flying', psychic: 'bg-type-psychic', bug: 'bg-type-bug',
  rock: 'bg-type-rock', ghost: 'bg-type-ghost', dragon: 'bg-type-dragon', dark: 'bg-type-dark',
  steel: 'bg-type-steel', fairy: 'bg-type-fairy',
};

export default function TypeBadge({ type }: { type: PokeType }) {
  return (
    <span
      className={`${BG[type]} inline-block rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white`}
      style={{ textShadow: '0 1px 1px rgb(0 0 0 / 0.5)' }}
    >
      {type}
    </span>
  );
}
