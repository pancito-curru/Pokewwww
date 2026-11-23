import { useCallback, useEffect, useMemo } from 'react';
import ItemSprite from '../../components/ItemSprite';
import ShareButton from '../../components/ShareButton';
import { useT } from '../../i18n';
import {
  MAX_GUESSES,
  POCKETS,
  guessRow,
  hintsFor,
  itemName,
  letterCounts,
  dailyPool as dailyItems,
  poolFor,
  redactEffect,
  type Item,
} from '../../lib/items';
import { btnPrimary, btnSecondary, GiveUp, PuzzleHeader } from '../puzzle/Chrome';
import ItemInput from './ItemInput';
import { useItemStore } from './store';
import { useItems } from './useItems';

export default function ItemGame() {
  const { t } = useT();
  const items = useItems();
  if (!items) return <p className="py-10 text-center text-sm text-slate-500">{t('item.loading')}</p>;
  return <Game items={items} />;
}

function Game({ items }: { items: Item[] }) {
  const { t, lang } = useT();
  const mode = useItemStore((s) => s.mode);
  const round = useItemStore((s) => (s.mode === 'daily' ? s.daily : s.unlimited));
  const pockets = useItemStore((s) => s.pockets);
  const stats = useItemStore((s) => s.stats[s.mode]);
  const { setMode, ensureRound, newUnlimited, guess, giveUp, setPockets } = useItemStore.getState();

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const dailyPool = useMemo(() => dailyItems(items), [items]);
  const unlimitedPool = useMemo(() => poolFor(items, pockets), [items, pockets]);
  const pool = mode === 'daily' ? dailyPool : unlimitedPool;

  useEffect(() => ensureRound(pool), [mode, ensureRound, pool]);
  const guessed = useMemo(() => new Set(round?.guesses), [round?.guesses]);
  const onNew = useCallback(() => newUnlimited(unlimitedPool), [newUnlimited, unlimitedPool]);

  if (!round) return null;
  const target = byId.get(round.targetId)!;
  const over = round.status !== 'playing';
  const won = round.status === 'won';
  const misses = round.guesses.filter((g) => g !== round.targetId);
  const hints = hintsFor(target, misses.length);
  const winPct = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;

  return (
    <div className="space-y-5">
      <PuzzleHeader title={t('mode.item.title')} intro={t('item.intro', { max: MAX_GUESSES })} mode={mode} onMode={setMode} />

      {mode === 'unlimited' && (
        <details className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800/60">
          <summary className="cursor-pointer text-sm font-semibold">{t('item.options')}</summary>
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label={t('item.pockets')}>
              {[null, ...POCKETS].map((p) => {
                const on = p === null ? pockets.length === 0 : pockets.includes(p);
                const toggle = () => {
                  if (p === null) return setPockets([]);
                  const next = pockets.includes(p) ? pockets.filter((x) => x !== p) : [...pockets, p];
                  setPockets(next.length === POCKETS.length ? [] : next);
                };
                return (
                  <button
                    key={p ?? 'all'}
                    type="button"
                    aria-pressed={on}
                    onClick={toggle}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                      on
                        ? 'border-red-600 bg-red-600 text-white'
                        : 'border-slate-300 bg-white hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800'
                    }`}
                  >
                    {p === null ? t('filter.all') : t(`item.pocket.${p}`)}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={onNew} className={btnPrimary}>
                {t('item.new')}
              </button>
              <span className="text-xs text-slate-500">{t('item.possible', { n: unlimitedPool.length })}</span>
            </div>
          </div>
        </details>
      )}

      <section className="mx-auto max-w-xl rounded-2xl bg-white p-5 shadow-lg dark:bg-slate-800 sm:p-8">
        <h2 className="mb-4 text-center font-pixel text-sm text-slate-500">{t('item.which')}</h2>
        <div className="flex justify-center">
          <div
            className={`flex h-48 w-48 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-900/60 ${
              over ? (won ? 'ring-4 ring-emerald-400' : 'ring-4 ring-rose-400') : ''
            }`}
          >
            <ItemSprite
              slug={target.slug}
              size={160}
              alt={over ? itemName(target, lang) : t('item.mystery')}
              className={over ? 'animate-pop' : ''}
            />
          </div>
        </div>

        {!over && hints.length > 0 && (
          <ul className="mt-5 space-y-2 text-sm" aria-label={t('item.hints')}>
            {hints.includes('category') && (
              <li className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-500">{t('item.hint.category')}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold dark:bg-slate-700">
                  {t(`item.pocket.${target.pocket}` as 'item.pocket.misc')}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold dark:bg-slate-700">{target.category}</span>
              </li>
            )}
            {hints.includes('length') && (
              <li className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-500">{t('item.hint.length')}</span>
                <span className="font-mono tracking-widest">
                  {letterCounts(itemName(target, lang))
                    .map((n) => '_'.repeat(n))
                    .join('  ')}
                </span>
              </li>
            )}
            {hints.includes('effect') && (
              <li>
                <span className="mr-2 font-semibold text-slate-500">{t('item.hint.effect')}</span>
                <span className="italic text-slate-700 dark:text-slate-300">“{redactEffect(target)}”</span>
              </li>
            )}
            {hints.includes('letter') && (
              <li className="flex items-center gap-2">
                <span className="font-semibold text-slate-500">{t('item.hint.letter')}</span>
                <span className="font-mono text-lg font-bold">{itemName(target, lang).charAt(0).toUpperCase()}</span>
              </li>
            )}
          </ul>
        )}
      </section>

      {!over && (
        <div className="mx-auto flex max-w-xl flex-wrap items-start gap-3">
          <ItemInput items={items} onSelect={guess} exclude={guessed} />
          <div className="flex items-center gap-3 py-2.5 text-sm">
            <span className="tabular-nums text-slate-600 dark:text-slate-300">
              {t('puz.guessOf', { n: round.guesses.length + 1, max: MAX_GUESSES })}
            </span>
            {round.guesses.length > 0 && <GiveUp onConfirm={giveUp} />}
          </div>
        </div>
      )}

      {misses.length > 0 && (
        <div className="mx-auto flex max-w-xl flex-wrap gap-2">
          {misses.map((id) => {
            const it = byId.get(id)!;
            return (
              <span
                key={id}
                className="flex animate-pop items-center gap-1 rounded-full bg-rose-50 py-0.5 pl-1 pr-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
              >
                <ItemSprite slug={it.slug} size={24} /> ✗ {itemName(it, lang)}
              </span>
            );
          })}
        </div>
      )}

      {over && (
        <section className="mx-auto flex max-w-3xl flex-col gap-5 rounded-xl bg-white p-5 shadow dark:bg-slate-800/60 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className={`text-sm font-semibold uppercase tracking-wide ${won ? 'text-emerald-600' : 'text-slate-500'}`}>
              {won ? t('puz.gotIt', { n: round.guesses.length }) : t('puz.itWas')}
            </p>
            <h2 className="mt-1 text-2xl font-bold">{itemName(target, lang)}</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {t(`item.pocket.${target.pocket}` as 'item.pocket.misc')} · {target.category}
            </p>
            {target.effect && <p className="mt-2 text-sm italic text-slate-600 dark:text-slate-300">“{target.effect}”</p>}
            <dl className="mt-4 flex gap-5 text-center text-sm">
              {[
                [t('puz.played'), stats.played],
                [t('puz.winPct'), winPct],
                [t('puz.streak'), stats.streak],
                [t('puz.best'), stats.maxStreak],
              ].map(([label, v]) => (
                <div key={label}>
                  <dd className="text-xl font-bold tabular-nums">{v}</dd>
                  <dt className="text-xs text-slate-500">{label}</dt>
                </div>
              ))}
            </dl>
          </div>
          <div className="flex flex-col gap-2 sm:w-44">
            <ShareButton
              text={() =>
                `Pokewwwww ${t('mode.item.title')} ${round.mode === 'daily' ? round.key : t('common.unlimitedKey')} · ${
                  won ? round.guesses.length : 'X'
                }/${MAX_GUESSES}\n${guessRow(misses.length, won)}`
              }
            />
            <button type="button" onClick={onNew} className={btnPrimary}>
              {round.mode === 'daily' ? t('puz.playUnlimited') : t('item.new')}
            </button>
            {round.mode === 'daily' && <p className="text-center text-xs text-slate-500">{t('item.tomorrow')}</p>}
            {round.mode === 'unlimited' && (
              <button type="button" className={btnSecondary} onClick={() => setMode('daily')}>
                {t('mode.daily')}
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
