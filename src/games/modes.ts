export interface GameMode {
  path: string;
  title: string;
  blurb: string;
  /** Dex numbers shown as the card's sprite collage. */
  sprites: number[];
}

export const MODES: GameMode[] = [
  {
    path: '/timed',
    title: "Name 'Em All",
    blurb: 'Race the clock and name every Pokémon you can.',
    sprites: [1, 4, 7],
  },
  {
    path: '/guess',
    title: "Who's That?",
    blurb: 'Guess the hidden Pokémon. Every guess shows which traits match.',
    sprites: [132, 151, 570],
  },
  {
    path: '/wordle',
    title: 'Pokédle',
    blurb: 'Pick a word length, then guess the name letter by letter.',
    sprites: [201, 235, 700],
  },
  {
    path: '/crossword',
    title: 'Pokécross',
    blurb: 'Fill a crossword of Pokémon names using the clues.',
    sprites: [79, 143, 446],
  },
  {
    path: '/silhouette',
    title: 'Silhouettes',
    blurb: 'Name the Pokémon from its shadow: one a day, or as many as you can against the clock.',
    sprites: [94, 92, 93],
  },
  {
    path: '/cry',
    title: 'Cries',
    blurb: 'Name the Pokémon from its cry: one a day, or as many as you can against the clock.',
    sprites: [39, 441, 295],
  },
  {
    path: '/moveset',
    title: 'Moveset',
    blurb: 'Name the Pokémon from the moves it learns. Each miss reveals another move.',
    sprites: [68, 106, 107],
  },
  {
    path: '/hangman',
    title: 'Hangman',
    blurb: 'Guess the Pokémon’s name one letter at a time before the drawing is complete.',
    sprites: [425, 355, 354],
  },
];
