import { POKEDEX, byLength, type Pokemon } from '../data';

export type LetterState = 'correct' | 'present' | 'absent';

/** Smallest answer pool a length needs to be offered. */
export const MIN_POOL = 10;

/** Wordle scoring with correct duplicate-letter handling. */
export function score(guess: string, answer: string): LetterState[] {
  const res: LetterState[] = Array(guess.length).fill('absent');
  const counts: Record<string, number> = {};
  for (let i = 0; i < answer.length; i++) {
    if (guess[i] === answer[i]) res[i] = 'correct';
    else counts[answer[i]] = (counts[answer[i]] ?? 0) + 1;
  }
  for (let i = 0; i < guess.length; i++) {
    if (res[i] !== 'correct' && counts[guess[i]] > 0) {
      res[i] = 'present';
      counts[guess[i]]--;
    }
  }
  return res;
}

const RANK: Record<LetterState, number> = { absent: 0, present: 1, correct: 2 };

/** Best known state for every letter guessed so far (for colouring the keyboard). */
export function keyboardState(guesses: string[], answer: string): Record<string, LetterState> {
  const out: Record<string, LetterState> = {};
  for (const g of guesses) {
    score(g, answer).forEach((s, i) => {
      const prev = out[g[i]];
      if (!prev || RANK[s] > RANK[prev]) out[g[i]] = s;
    });
  }
  return out;
}

/** length + 1 rows, at least 6, at most 8. */
export const rowsFor = (length: number) => Math.min(8, Math.max(6, length + 1));

/** Lengths with at least MIN_POOL answers, with their pools. */
export function availableLengths(pool: Pokemon[]): { length: number; pool: Pokemon[] }[] {
  return [...byLength(pool).entries()]
    .filter(([, list]) => list.length >= MIN_POOL)
    .map(([length, list]) => ({ length, pool: list }))
    .sort((a, b) => a.length - b.length);
}

/** Every Pokémon name as letters, for strict-mode validation. */
const VALID = new Set([...byLength(POKEDEX).values()].flat().map((p) => p.letters));
export const isValidName = (letters: string) => VALID.has(letters);

const EMOJI: Record<LetterState, string> = { correct: '🟩', present: '🟨', absent: '⬛' };

export function shareGrid(guesses: string[], answer: string): string {
  return guesses.map((g) => score(g, answer).map((s) => EMOJI[s]).join('')).join('\n');
}
