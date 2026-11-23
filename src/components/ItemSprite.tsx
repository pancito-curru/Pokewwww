import { itemSpriteUrl } from '../data/sprites';

/** An item's sprite, enlarged without smoothing so the pixels stay crisp. */
export default function ItemSprite({
  slug,
  size = 32,
  alt = '',
  className = '',
}: {
  slug: string;
  /** Rendered width and height in px. */
  size?: number;
  alt?: string;
  className?: string;
}) {
  return (
    <img
      src={itemSpriteUrl(slug)}
      alt={alt}
      width={size}
      height={size}
      draggable={false}
      className={`pixelated select-none object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
