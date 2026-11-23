import { byId } from '../data';
import { spriteUrl } from '../data/sprites';

interface Props {
  id: number;
  scale?: number;
  silhouette?: boolean;
  /** The shiny variant of the sprite. */
  shiny?: boolean;
  className?: string;
}

/** PokéSprite Gen 8 box sprite (68×56), with the PokeAPI sprite as fallback for Gen 9. */
export default function Sprite({ id, scale = 1, silhouette = false, shiny = false, className = '' }: Props) {
  const p = byId.get(id);
  if (!p) return null;
  return (
    <span
      className={`inline-flex items-center justify-center ${className}`}
      style={{ width: 68 * scale, height: 56 * scale }}
    >
      <img
        src={spriteUrl(p, shiny)}
        alt={silhouette ? 'Unknown Pokémon' : p.name}
        loading="lazy"
        draggable={false}
        className="pixelated max-h-full max-w-full object-contain"
        style={{
          width: p.slug ? 68 * scale : 56 * scale,
          filter: silhouette ? 'brightness(0)' : undefined,
        }}
      />
    </span>
  );
}
