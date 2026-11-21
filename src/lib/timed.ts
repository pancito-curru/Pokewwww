import { byId, findByInput, REGIONS, type Region } from '../data';
import { normalize } from './normalize';

export type GuessResult =
  | { kind: 'none' }
  /** Exact match, safe to accept immediately. */
  | { kind: 'match'; id: number }
  /**
   * Exact match, but it is also the start of another unfound name in scope
   * (Mew → Mewtwo, Kabuto → Kabutops). Accept on Enter or after a short pause.
   */
  | { kind: 'ambiguous'; id: number }
  | { kind: 'already'; id: number }
  | { kind: 'outOfScope'; id: number };

export function resolveGuess(
  input: string,
  scope: ReadonlySet<number>,
  found: ReadonlySet<number>,
): GuessResult {
  const p = findByInput(input);
  if (!p) return { kind: 'none' };
  if (!scope.has(p.id)) return { kind: 'outOfScope', id: p.id };
  const prefixOfUnfound = isPrefixOfUnfound(normalize(input), p.id, scope, found);
  // "Mew" already found while the player is still typing "Mewtwo": stay quiet.
  if (found.has(p.id)) return prefixOfUnfound ? { kind: 'none' } : { kind: 'already', id: p.id };
  return prefixOfUnfound ? { kind: 'ambiguous', id: p.id } : { kind: 'match', id: p.id };
}

function isPrefixOfUnfound(norm: string, selfId: number, scope: ReadonlySet<number>, found: ReadonlySet<number>) {
  for (const id of scope) {
    if (id === selfId || found.has(id)) continue;
    const other = byId.get(id)!.norm;
    if (other.length > norm.length && other.startsWith(norm)) return true;
  }
  return false;
}

/** A typo hint counts names this many letters off or fewer ("fewer than 2 letters wrong"). */
export const MAX_TYPO = 1;
/** Shorter inputs are too likely to be a different Pokémon or still being typed. */
const MIN_TYPO_LENGTH = 4;

export interface NearMiss {
  id: number;
  found: boolean;
}

/**
 * Edit distance where a swap of two neighbouring letters counts as one mistake
 * (optimal string alignment). Gives up early once it exceeds `max`.
 */
export function typoDistance(a: string, b: string, max = MAX_TYPO): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev2 = new Array<number>(b.length + 1).fill(0);
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let d = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, prev2[j - 2] + 1);
      cur[j] = d;
      rowMin = Math.min(rowMin, d);
    }
    if (rowMin > max) return max + 1;
    prev2.splice(0, prev2.length, ...prev);
    prev = cur;
  }
  return prev[b.length];
}

/**
 * The in-scope Pokémon the input is a near-miss for, preferring ones not found yet.
 * Null when the input is short, an exact name, or still the start of some name.
 */
export function findNearMiss(
  input: string,
  scope: ReadonlySet<number>,
  found: ReadonlySet<number>,
): NearMiss | null {
  const norm = normalize(input);
  if (norm.length < MIN_TYPO_LENGTH || findByInput(input)) return null;
  let best: NearMiss | null = null;
  for (const id of scope) {
    const name = byId.get(id)!.norm;
    if (name.startsWith(norm)) return null; // still typing
    if (typoDistance(norm, name) > MAX_TYPO) continue;
    if (!found.has(id)) return { id, found: false };
    best ??= { id, found: true };
  }
  return best;
}

export interface GenStat {
  gen: number;
  region: Region;
  found: number;
  total: number;
}

export function perGenStats(scopeIds: readonly number[], found: ReadonlySet<number>): GenStat[] {
  const m = new Map<number, GenStat>();
  for (const id of scopeIds) {
    const gen = byId.get(id)!.generation;
    const s = m.get(gen) ?? { gen, region: REGIONS[gen], found: 0, total: 0 };
    s.total++;
    if (found.has(id)) s.found++;
    m.set(gen, s);
  }
  return [...m.values()].sort((a, b) => a.gen - b.gen);
}

/** Key for best scores: one record per generation set + duration combo. */
export function scopeKey(generations: readonly number[], durationMin: number | null, easy = false): string {
  const gens = generations.length ? [...generations].sort((a, b) => a - b).join(',') : 'all';
  return `${gens}|${durationMin ?? 'untimed'}${easy ? '|easy' : ''}`;
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}
