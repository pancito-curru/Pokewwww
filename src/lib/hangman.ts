/** Rules for Hangman with Pokémon names. */

/** Wrong letters allowed before the round is lost (head, body, 2 arms, 2 legs). */
export const MAX_MISSES = 6;

/** The A–Z letter a character is guessed with ('É' → 'E'), or null if it isn't a letter. */
export function letterOf(ch: string): string | null {
  const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  return /^[A-Z]$/.test(base) ? base : null;
}

/** Letters the player has to find. */
export function lettersNeeded(name: string): Set<string> {
  return new Set([...name].map(letterOf).filter((l): l is string => l !== null));
}

export interface Slot {
  /** Character as written in the name (keeps accents and case). */
  ch: string;
  /** Hidden until its letter is guessed; spaces, punctuation, ♀/♂ and digits are always shown. */
  hidden: boolean;
}

export function maskName(name: string, guessed: Iterable<string>): Slot[] {
  const g = new Set(guessed);
  return [...name].map((ch) => {
    const l = letterOf(ch);
    return { ch, hidden: l !== null && !g.has(l) };
  });
}

export interface HangmanState {
  misses: string[];
  hits: string[];
  solved: boolean;
  lost: boolean;
}

export function evaluate(name: string, guessed: string[]): HangmanState {
  const needed = lettersNeeded(name);
  const misses = guessed.filter((l) => !needed.has(l));
  const hits = guessed.filter((l) => needed.has(l));
  const solved = [...needed].every((l) => guessed.includes(l));
  return { misses, hits, solved, lost: !solved && misses.length >= MAX_MISSES };
}
