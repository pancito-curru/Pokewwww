export interface GameMode {
  path: string;
  /** Titles and blurbs live in the dictionaries as `mode.<id>.title` / `mode.<id>.blurb`. */
  id: 'timed' | 'guess' | 'wordle' | 'crossword' | 'silhouette' | 'cry' | 'moveset' | 'hangman' | 'shiny';
  /** Dex numbers shown as the card's sprite collage. */
  sprites: number[];
}

export const MODES: GameMode[] = [
  { path: '/timed', id: 'timed', sprites: [1, 4, 7] },
  { path: '/guess', id: 'guess', sprites: [132, 151, 570] },
  { path: '/wordle', id: 'wordle', sprites: [201, 235, 700] },
  { path: '/crossword', id: 'crossword', sprites: [79, 143, 446] },
  { path: '/silhouette', id: 'silhouette', sprites: [94, 92, 93] },
  { path: '/cry', id: 'cry', sprites: [39, 441, 295] },
  { path: '/moveset', id: 'moveset', sprites: [68, 106, 107] },
  { path: '/hangman', id: 'hangman', sprites: [425, 355, 354] },
  { path: '/shiny', id: 'shiny', sprites: [6, 130, 25] },
];
