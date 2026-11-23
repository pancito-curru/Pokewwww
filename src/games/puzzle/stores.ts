import { byId } from '../../data';
import { evaluate } from '../../lib/hangman';
import { MAX_GUESSES } from '../../lib/moveset';
import { MAX_GUESSES as INDEX_MAX_GUESSES } from '../../lib/pokeindex';
import { evaluate as shinyEvaluate, roundSeed, shinyIndex } from '../../lib/shiny';
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

/** Shiny Hunt: the target is the Pokémon repeated on the board; guesses are the board positions clicked. */
export const useShinyStore = createPuzzleStore<number>({
  name: 'shiny',
  addGuess: (r, id) => {
    if (r.guesses.includes(id)) return null;
    const guesses = [...r.guesses, id];
    const s = shinyEvaluate(guesses, shinyIndex(roundSeed(r)));
    return { ...r, guesses, status: s.won ? 'won' : s.lost ? 'lost' : 'playing' };
  },
  bucket: (r) => shinyEvaluate(r.guesses, shinyIndex(roundSeed(r))).misses,
});

/** PokeIndex: guesses are Pokémon ids. */
export const usePokeIndexStore = createPuzzleStore<number>({
  name: 'pokeindex',
  addGuess: (r, id) => {
    if (r.guesses.includes(id)) return null;
    const guesses = [...r.guesses, id];
    const status = id === r.targetId ? 'won' : guesses.length >= INDEX_MAX_GUESSES ? 'lost' : 'playing';
    return { ...r, guesses, status };
  },
  bucket: (r) => r.guesses.length,
});
