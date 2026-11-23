/** One area's messages in both languages; the compiler rejects a key that is missing from either. */
export function defineArea<K extends string>(area: { en: Record<K, string>; es: Record<K, string> }) {
  return area;
}
