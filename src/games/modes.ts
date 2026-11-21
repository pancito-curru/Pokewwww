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
    sprites: [25, 1, 4, 7],
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
];
