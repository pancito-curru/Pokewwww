/** Normalise any user input or display name into a comparable key. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // Flabébé → flabebe
    .replace(/♀/g, 'f')
    .replace(/♂/g, 'm')
    .replace(/[^a-z0-9]/g, ''); // Mr. Mime → mrmime, Type: Null → typenull
}

/** A–Z only, uppercase. Used by wordle / crossword. */
export function toLetters(name: string): string {
  return normalize(name).replace(/[0-9]/g, '').toUpperCase();
}

/** Names whose normalised form contains digits are excluded from letter games. */
export function isLetterSafe(name: string): boolean {
  return !/[0-9]/.test(normalize(name));
}

/** Hand-maintained extra spellings, keyed by national dex number. */
export const EXTRA_ALIASES: Record<number, string[]> = {
  29: ['nidoranfemale', 'nidoran female'],
  32: ['nidoranmale', 'nidoran male'],
  83: ['farfetched'],
  122: ['mistermime'],
  439: ['mimejunior'],
  865: ['sirfetched'],
  866: ['mistermrime'],
};
