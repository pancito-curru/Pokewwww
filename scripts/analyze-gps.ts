/**
 * How ambiguous is a PokeGPS clue? For every Pokémon with encounters, counts how many Pokémon fit the
 * clue (types + listed places) and how many still fit once the extras are added.
 *
 *   npx tsx scripts/analyze-gps.ts
 */
import { POKEDEX } from '../src/data';
import raw from '../src/data/locations.json';
import { buildClue, fits, hasEncounters, type LocationData } from '../src/lib/gps';

const data = raw as unknown as LocationData;
const cands = POKEDEX.filter((p) => hasEncounters(data, p.id));
const bucket = (n: number) => (n === 1 ? '1' : n === 2 ? '2' : n <= 5 ? '3-5' : '6+');
const before: Record<string, number> = {};
const after: Record<string, number> = {};
let withExtras = 0;
let worst = { name: '', n: 0 };

for (const p of cands) {
  const clue = buildClue(data, p, 12345, cands);
  const base = { ...clue, extras: null };
  const n0 = cands.filter((c) => fits(data, base, c)).length;
  const n1 = cands.filter((c) => fits(data, clue, c)).length;
  before[bucket(n0)] = (before[bucket(n0)] ?? 0) + 1;
  after[bucket(n1)] = (after[bucket(n1)] ?? 0) + 1;
  if (clue.extras) withExtras++;
  if (n1 > worst.n) worst = { name: p.name, n: n1 };
}
console.log(`${cands.length} Pokémon with encounters`);
console.log('answers that fit, types + places only:', before);
console.log(`clues that get extras: ${withExtras} (${Math.round((withExtras / cands.length) * 100)}%)`);
console.log('answers that fit, with extras when needed:', after, 'worst:', worst);
