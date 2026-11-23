import { useEffect, useState } from 'react';
import type { LocationData } from '../../lib/gps';

let cached: LocationData | null = null;

/** The location data (~170 kB) loads only when PokeGPS opens, and once per visit. */
export function useLocationData(): LocationData | null {
  const [data, setData] = useState<LocationData | null>(cached);
  useEffect(() => {
    if (cached) return;
    import('../../data/locations.json').then((m) => {
      cached = m.default as unknown as LocationData;
      setData(cached);
    });
  }, []);
  return data;
}
