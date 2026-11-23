export type Lang = 'en' | 'es';
export const LANGS: readonly Lang[] = ['en', 'es'];

export type Params = Record<string, string | number>;

/** Spanish if the browser says so, English otherwise. */
export const detectLang = (nav: string | undefined): Lang => (nav?.toLowerCase().startsWith('es') ? 'es' : 'en');

/**
 * Look a message up and fill its `{name}` placeholders. With a `count` param it picks the
 * `<key>_one` / `<key>_other` variant (English and Spanish share the same plural rule).
 * A missing key renders as the key itself, so gaps are visible instead of crashing.
 */
export function translate(dict: Record<string, string>, key: string, params?: Params): string {
  const plural = params && typeof params.count === 'number' ? `${key}_${params.count === 1 ? 'one' : 'other'}` : null;
  const text = (plural && dict[plural]) ?? dict[key] ?? key;
  return params ? text.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m)) : text;
}
