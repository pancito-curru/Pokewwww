import { useState } from 'react';
import FilterPanel from '../../components/FilterPanel';
import { useT } from '../../i18n';
import { todayKey } from '../../lib/rng';
import { formatClock } from '../../lib/timed';
import type { ClueDifficulty } from '../../lib/crossword/clues';
import { SIZES, isOver, useCrossStore, type CrossMode, type CrossSize } from './store';

const DIFFICULTIES: ClueDifficulty[] = ['easy', 'normal', 'hard'];

export default function Setup() {
  const { t } = useT();
  const { settings, setSettings, play, newUnlimited, daily, unlimited, stats } = useCrossStore();
  const isDaily = settings.mode === 'daily';

  const opt = (on: boolean) =>
    `rounded-lg border px-4 py-2 text-sm font-semibold transition ${
      on
        ? 'border-red-600 bg-red-600 text-white'
        : 'border-slate-300 bg-white hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800'
    }`;
  const modeBtn = (m: CrossMode, label: string) => (
    <button type="button" className={opt(settings.mode === m)} aria-pressed={settings.mode === m} onClick={() => setSettings({ mode: m })}>
      {label}
    </button>
  );

  // An unlimited puzzle still being worked on: offer to resume it or replace it.
  const unlimitedInProgress = !isDaily && !!unlimited && !isOver(unlimited);
  const label = isDaily
    ? daily?.key === todayKey()
      ? daily.solvedAt
        ? t('cw.seeSolved')
        : isOver(daily)
          ? t('cw.seePuzzle')
          : t('cw.continue')
      : t('cw.play')
    : unlimitedInProgress
      ? t('cw.continue')
      : t('cw.new');
  const [confirmNew, setConfirmNew] = useState(false);

  const s = stats[settings.mode];

  return (
    <section className="space-y-6 rounded-xl bg-white p-6 shadow dark:bg-slate-800/60">
      <header>
        <h1 className="font-pixel text-xl">{t('mode.crossword.title')}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {t('cw.intro')}
        </p>
      </header>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{t('set.mode')}</h2>
        <div className="flex flex-wrap gap-2">
          {modeBtn('daily', t('tab.daily'))}
          {modeBtn('unlimited', t('mode.unlimited'))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {isDaily
            ? t('cw.dailyInfo')
            : t('cw.unlimitedInfo')}
        </p>
      </div>

      {!isDaily && (
        <>
          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{t('cw.sizeH')}</h2>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(SIZES) as CrossSize[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  className={`${opt(settings.size === k)} flex flex-col items-center leading-tight`}
                  aria-pressed={settings.size === k}
                  onClick={() => setSettings({ size: k })}
                >
                  {t(`cw.size.${k}`)}
                  <span className="text-[11px] font-normal opacity-80">
                    {t('cw.sizeInfo', { words: SIZES[k].words, n: SIZES[k].maxSize })}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{t('cw.cluesH')}</h2>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTIES.map((k) => (
                <button
                  key={k}
                  type="button"
                  className={`${opt(settings.difficulty === k)} flex flex-col items-start leading-tight`}
                  aria-pressed={settings.difficulty === k}
                  onClick={() => setSettings({ difficulty: k })}
                >
                  {t(`cw.diff.${k}`)}
                  <span className="text-[11px] font-normal opacity-80">{t(`cw.diffHint.${k}`)}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{t('filter.label')}</h2>
            <FilterPanel value={settings.generations} onChange={(generations) => setSettings({ generations })} />
          </div>
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-5 dark:border-slate-700">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {t('cw.solved')} <strong>{s.solved}</strong>
          {(Object.keys(SIZES) as CrossSize[])
            .filter((k) => s.best[k] !== undefined)
            .map((k) => (
              <span key={k} className="ml-3">
                · {t('cw.best', { size: t(`cw.size.${k}`).toLowerCase(), time: formatClock(s.best[k]!) })}
              </span>
            ))}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {unlimitedInProgress &&
            (confirmNew ? (
              <span className="flex items-center gap-2 text-sm">
                {t('cw.discard')}
                <button
                  type="button"
                  onClick={newUnlimited}
                  className="rounded bg-red-600 px-2.5 py-1 font-semibold text-white"
                >
                  {t('common.yes')}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmNew(false)}
                  className="rounded border border-slate-300 px-2.5 py-1 dark:border-slate-600"
                >
                  {t('common.no')}
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmNew(true)}
                className="rounded-lg border border-slate-300 px-4 py-2.5 font-semibold hover:border-slate-400 dark:border-slate-600"
              >
                {t('cw.new')}
              </button>
            ))}
          <button
            type="button"
            onClick={play}
            className="rounded-lg bg-red-600 px-6 py-2.5 font-semibold text-white shadow hover:bg-red-700"
          >
            {label}
          </button>
        </div>
      </div>
    </section>
  );
}
