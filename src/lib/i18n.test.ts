import { describe, expect, it } from 'vitest';
import { detectLang, translate } from './i18n';
import { DICTS } from '../i18n';

describe('translate', () => {
  const dict = { hi: 'Hi {name}!', 'n_one': '{count} guess', 'n_other': '{count} guesses' };
  it('fills placeholders and leaves unknown ones', () => {
    expect(translate(dict, 'hi', { name: 'Ash' })).toBe('Hi Ash!');
    expect(translate(dict, 'hi', {})).toBe('Hi {name}!');
  });
  it('picks the plural form from count', () => {
    expect(translate(dict, 'n', { count: 1 })).toBe('1 guess');
    expect(translate(dict, 'n', { count: 0 })).toBe('0 guesses');
    expect(translate(dict, 'n', { count: 5 })).toBe('5 guesses');
  });
  it('shows the key when it is missing', () => {
    expect(translate(dict, 'nope')).toBe('nope');
  });
});

describe('detectLang', () => {
  it('maps Spanish locales to es and the rest to en', () => {
    expect(detectLang('es-AR')).toBe('es');
    expect(detectLang('ES')).toBe('es');
    expect(detectLang('en-US')).toBe('en');
    expect(detectLang(undefined)).toBe('en');
  });
});

describe('dictionaries', () => {
  it('have the same keys and the same placeholders in both languages', () => {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    expect(Object.keys(DICTS.es).sort()).toEqual(Object.keys(DICTS.en).sort());
    for (const [k, v] of Object.entries(DICTS.en)) expect(ph(DICTS.es[k as keyof typeof DICTS.es]), k).toBe(ph(v));
  });
});
