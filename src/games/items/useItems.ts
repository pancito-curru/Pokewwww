import { useEffect, useState } from 'react';
import { parseItems, type Item, type ItemData } from '../../lib/items';

let cached: Item[] | null = null;

/** The item data (~100 kB) loads only when the item game opens, and once per visit. */
export function useItems(): Item[] | null {
  const [items, setItems] = useState<Item[] | null>(cached);
  useEffect(() => {
    if (cached) return;
    import('../../data/items.json').then((m) => {
      cached = parseItems(m.default as unknown as ItemData);
      setItems(cached);
    });
  }, []);
  return items;
}
