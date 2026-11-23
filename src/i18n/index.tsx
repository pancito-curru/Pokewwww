import { Fragment, type ReactNode } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { detectLang, translate, type Lang, type Params } from '../lib/i18n';
import { common } from './dict/common';
import { shiny } from './dict/shiny';
import { games } from './dict/games';
import { puzzles } from './dict/puzzles';
import { identify } from './dict/identify';
import { contact } from './dict/contact';
import { gps } from './dict/gps';

const AREAS = [common, shiny, games, puzzles, identify, contact, gps];
const merge = (lang: Lang) => Object.assign({}, ...AREAS.map((a) => a[lang])) as Record<string, string>;

export const DICTS: Record<Lang, Record<string, string>> = { en: merge('en'), es: merge('es') };

type AllKeys = keyof (typeof common.en & typeof shiny.en & typeof games.en & typeof puzzles.en & typeof identify.en & typeof contact.en & typeof gps.en);
/** Plural variants (`key_one` / `key_other`) are addressed by their base key. */
export type MsgKey = AllKeys extends infer K ? (K extends `${infer B}_${'one' | 'other'}` ? B : K) : never;

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const useLang = create<LangState>()(
  persist(
    (set) => ({
      lang: detectLang(typeof navigator === 'undefined' ? undefined : navigator.language),
      setLang: (lang) => set({ lang }),
    }),
    { name: 'pokewwww-lang', version: 1 },
  ),
);

export type TFn = (key: MsgKey, params?: Params) => string;

/** Message for a language outside React (share text, tests). */
export const tFor = (lang: Lang): TFn => (key, params) => translate(DICTS[lang], key, params);

/** `t` for strings and `tx` for messages whose `{placeholders}` are React nodes (links, bold). */
export function useT() {
  const lang = useLang((s) => s.lang);
  const t = tFor(lang);
  const tx = (key: MsgKey, parts: Record<string, ReactNode>): ReactNode => {
    const text = translate(DICTS[lang], key);
    return text.split(/(\{\w+\})/).map((chunk, i) => {
      const name = /^\{(\w+)\}$/.exec(chunk)?.[1];
      return <Fragment key={i}>{name && name in parts ? parts[name] : chunk}</Fragment>;
    });
  };
  return { t, tx, lang };
}
