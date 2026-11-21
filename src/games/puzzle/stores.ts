import { byId } from '../../data';
import { evaluate } from '../../lib/hangman';
import { MAX_GUESSES } from '../../lib/moveset';
import { createPuzzleStore } from './createPuzzleStore';

/** Moveset: guesses are Pokémon ids. */
export const useMovesetStore = createPuzzleStore<number>({
  name: 'moveset',
  addGuess: (r, id) => {
    if (r.guesses.includes(id)) return null;
    const guesses = [...r.guesses, id];
    const status = id === r.targetId ? 'won' : guesses.length >= MAX_GUESSES ? 'lost' : 'playing';
    return { ...r, guesses, status };
  },
  bucket: (r) => r.guesses.length,
});

/** Hangman: guesses are A–Z letters. */
export const useHangmanStore = createPuzzleStore<string>({
  name: 'hangman',
  addGuess: (r, letter) => {
    const l = letter.toUpperCase();
    if (!/^[A-Z]$/.test(l) || r.guesses.includes(l)) return null;
    const guesses = [...r.guesses, l];
    const s = evaluate(byId.get(r.targetId)!.name, guesses);
    return { ...r, guesses, status: s.solved ? 'won' : s.lost ? 'lost' : 'playing' };
  },
  bucket: (r) => evaluate(byId.get(r.targetId)!.name, r.guesses).misses.length,
});
