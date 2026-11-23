import { useState, type ReactNode } from 'react';
import FilterPanel from '../../components/FilterPanel';
import ShareButton from '../../components/ShareButton';
import Sprite from '../../components/Sprite';
import TypeBadge from '../../components/TypeBadge';
import { byId, getPool } from '../../data';
import { useT } from '../../i18n';
import type { PuzzleStats } from '../../lib/stats';
import type { PuzzleMode } from './createPuzzleStore';

export const btnPrimary = 'rounded-lg bg-red-600 px-4 py-2 font-semibold text-white shadow hover:bg-red-700';
export const btnSecondary =
  'rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold hover:border-slate-400 disabled:opacity-40 dark:border-slate-600';

/** Title, one-line intro and the Daily / Unlimited tabs. */
export function PuzzleHeader({
  title,
  intro,
  mode,
  onMode,
  explore,
}: {
  title: string;
  intro: ReactNode;
  mode: PuzzleMode;
  onMode: (m: PuzzleMode) => void;
  /** A third tab for a mode outside the puzzle engine (PokeGPS map exploring). */
  explore?: { label: string; active: boolean; onSelect: () => void };
}) {
  const { t } = useT();
  const tab = (m: PuzzleMode, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === m && !explore?.active}
      onClick={() => onMode(m)}
      className={`rounded-md px-4 py-1.5 text-sm font-semibold transition ${
        mode === m && !explore?.active ? 'bg-white shadow dark:bg-slate-700' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
      }`}
    >
      {label}
    </button>
  );
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-pixel text-xl">{title}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{intro}</p>
      </div>
      <div role="tablist" className="flex rounded-lg bg-slate-200 p-1 dark:bg-slate-800">
        {tab('daily', t('mode.daily'))}
        {tab('unlimited', t('mode.unlimited'))}
        {explore && (
          <button
            type="button"
            role="tab"
            aria-selected={explore.active}
            onClick={explore.onSelect}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold transition ${
              explore.active ? 'bg-white shadow dark:bg-slate-700' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {explore.label}
          </button>
        )}
      </div>
    </header>
  );
}

/** Generation filter + "New Pokémon" for unlimited mode. */
export function UnlimitedOptions({
  generations,
  onGenerations,
  onNew,
  eligible,
}: {
  generations: number[];
  onGenerations: (g: number[]) => void;
  onNew: () => void;
  eligible?: (id: number) => boolean;
}) {
  const { t } = useT();
  const pool = getPool({ generations });
  const size = eligible ? pool.filter((p) => eligible(p.id)).length : pool.length;
  return (
    <details className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800/60">
      <summary className="cursor-pointer text-sm font-semibold">{t('puz.options')}</summary>
      <div className="mt-3 space-y-3">
        <FilterPanel value={generations} onChange={onGenerations} />
        <div className="flex items-center gap-3">
          <button type="button" onClick={onNew} className={btnPrimary}>
            {t('puz.new')}
          </button>
          <span className="text-xs text-slate-500">{t('puz.possible', { n: size })}</span>
        </div>
      </div>
    </details>
  );
}

export function GiveUp({ onConfirm }: { onConfirm: () => void }) {
  const { t } = useT();
  const [confirm, setConfirm] = useState(false);
  return confirm ? (
    <span className="flex items-center gap-2 text-sm">
      {t('common.giveUpQ')}
      <button type="button" onClick={onConfirm} className="rounded bg-red-600 px-2.5 py-1 font-semibold text-white">
        {t('common.yes')}
      </button>
      <button type="button" onClick={() => setConfirm(false)} className={btnSecondary}>
        {t('common.no')}
      </button>
    </span>
  ) : (
    <button type="button" onClick={() => setConfirm(true)} className={`${btnSecondary} hover:border-red-500 hover:text-red-600`}>
      {t('common.giveUp')}
    </button>
  );
}

/** End-of-round card: the answer, stats, share and what to do next. */
export function PuzzleResult({
  targetId,
  won,
  headline,
  stats,
  shareText,
  daily,
  onNext,
  shiny = false,
}: {
  targetId: number;
  won: boolean;
  headline: string;
  stats: PuzzleStats;
  shareText: () => string;
  daily: boolean;
  onNext: () => void;
  /** Show the target's shiny sprite. */
  shiny?: boolean;
}) {
  const { t } = useT();
  const p = byId.get(targetId)!;
  const winPct = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
  return (
    <section className="flex flex-col gap-5 rounded-xl bg-white p-5 shadow dark:bg-slate-800/60 sm:flex-row sm:items-center">
      <Sprite id={p.id} scale={2.5} shiny={shiny} className="animate-pop self-center" />
      <div className="flex-1">
        <p className={`text-sm font-semibold uppercase tracking-wide ${won ? 'text-emerald-600' : 'text-slate-500'}`}>
          {headline}
        </p>
        <h2 className="mt-1 text-2xl font-bold">
          {p.name} <span className="font-mono text-base font-normal text-slate-400">#{p.id}</span>
        </h2>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          {p.types.map((t) => (
            <TypeBadge key={t} type={t} />
          ))}
          <span>{p.genus}</span>
        </div>
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
        <ShareButton text={shareText} />
        <button type="button" onClick={onNext} className={btnPrimary}>
          {daily ? t('puz.playUnlimited') : t('puz.new')}
        </button>
        {daily && <p className="text-center text-xs text-slate-500">{t('puz.tomorrow')}</p>}
      </div>
    </section>
  );
}

export function WrongGuesses({ ids }: { ids: number[] }) {
  if (!ids.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {ids.map((id) => (
        <span
          key={id}
          className="flex animate-pop items-center gap-1 rounded-full bg-rose-50 py-0.5 pl-1 pr-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
        >
          <Sprite id={id} scale={0.5} /> ✗ {byId.get(id)!.name}
        </span>
      ))}
    </div>
  );
}
