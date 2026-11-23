import { useT } from '../../i18n';
import { useMemo } from 'react';
import { formatClock, perGenStats, scopeKey } from '../../lib/timed';
import { useTimedStore } from './store';
import DexGrid from './DexGrid';
import ShareButton from '../../components/ShareButton';


export default function Results() {
  const { t } = useT();
  const { game, best, start, toSetup } = useTimedStore();
  const found = useMemo(() => new Set(game.found), [game.found]);
  const stats = useMemo(() => perGenStats(game.scopeIds, found), [game.scopeIds, found]);

  const ms = (game.endedAt ?? game.startedAt) - game.startedAt;
  const total = game.scopeIds.length;
  const pct = total ? Math.round((game.found.length / total) * 100) : 0;
  const perMin = ms > 0 ? (game.found.length / (ms / 60_000)).toFixed(1) : '0';
  const record = best[scopeKey(game.settings.generations, game.settings.duration, game.settings.easy)];

  const shareText = () => {
    const gens = game.settings.generations.length ? t('status.gen', { n: game.settings.generations.join(', ') }) : t('tm.allGens');
    const timer = game.settings.duration ? t('status.min', { n: game.settings.duration }) : t('tm.untimed');
    const bar = (f: number, t: number) => {
      const filled = Math.round((f / t) * 10);
      return '🟩'.repeat(filled) + '⬜'.repeat(10 - filled);
    };
    return [
      `Pokewwwww ${t('mode.timed.title')} · ${gens} · ${timer}${game.settings.easy ? ` · ${t('tm.easyLc')}` : ''}`,
      t('tm.shareLine', { found: game.found.length, total, pct, time: formatClock(ms) }),
      ...(stats.length > 1 ? stats.map((s) => `${t('status.gen', { n: s.gen })} ${bar(s.found, s.total)} ${s.found}/${s.total}`) : []),
    ].join('\n');
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white p-6 shadow dark:bg-slate-800/60">
        <h1 className="font-pixel text-xl">{t(`tm.end.${game.endReason ?? 'gaveUp'}`)}</h1>
        {game.newBest && (
          <p className="mt-2 inline-block rounded bg-amber-100 px-2 py-0.5 text-sm font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
            {t('id.newBest')}
          </p>
        )}

        <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label={t('tm.found')} value={`${game.found.length} / ${total}`} />
          <Stat label={t('tm.completion')} value={`${pct}%`} />
          <Stat label={t('tm.time')} value={formatClock(ms)} />
          <Stat label={t('tm.perMin')} value={perMin} />
        </dl>

        {stats.length > 1 && (
          <div className="mt-6 space-y-2">
            {stats.map((s) => {
              const w = Math.round((s.found / s.total) * 100);
              return (
                <div key={s.gen} className="grid grid-cols-[7rem_1fr_4.5rem] items-center gap-3 text-sm">
                  <span>
                    {t('status.gen', { n: s.gen })} · {s.region}
                  </span>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${w}%` }} />
                  </div>
                  <span className="text-right tabular-nums text-slate-500">
                    {s.found}/{s.total}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {record && !game.newBest && (
          <p className="mt-4 text-sm text-slate-500">
            {t('tm.bestSetup', { found: record.found, total: record.total, time: formatClock(record.ms) })}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={start}
            className="rounded-lg bg-red-600 px-5 py-2.5 font-semibold text-white shadow hover:bg-red-700"
          >
            {t('id.playAgain')}
          </button>
          <button
            type="button"
            onClick={toSetup}
            className="rounded-lg border border-slate-300 px-5 py-2.5 font-semibold hover:border-slate-400 dark:border-slate-600"
          >
            {t('id.changeSettings')}
          </button>
          <ShareButton text={shareText} className="py-2.5" />
        </div>
      </section>

      {game.found.length < total && (
        <p className="text-sm text-slate-500">
          {t('tm.missedRed')}
        </p>
      )}
      <DexGrid scopeIds={game.scopeIds} found={found} ended silhouettes={false} lastId={null} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-100 p-3 dark:bg-slate-900/60">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}
