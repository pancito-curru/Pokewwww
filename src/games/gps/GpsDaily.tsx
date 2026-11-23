import { useEffect, useMemo } from 'react';
import ShareButton from '../../components/ShareButton';
import { useT } from '../../i18n';
import { dailyMap, shareRow, type LocationData } from '../../lib/gps';
import { btnPrimary } from '../puzzle/Chrome';
import MapBoard from './MapBoard';
import { useGpsStore } from './store';

/** Today's place, the same for everyone: name every Pokémon that appears there. */
export default function GpsDaily({ data }: { data: LocationData }) {
  const { t } = useT();
  const daily = useGpsStore((s) => s.daily);
  const stats = useGpsStore((s) => s.dailyStats);
  const { ensureDaily, guessDaily, giveUpDaily, setMode } = useGpsStore.getState();

  const today = useMemo(() => dailyMap(data), [data]);
  useEffect(() => ensureDaily(today.loc, today.region, today.count), [ensureDaily, today]);

  if (!daily) return null;
  const won = daily.status === 'done';
  const winPct = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;

  return (
    <MapBoard
      data={data}
      map={daily}
      heading={t('gps.youAreIn', { region: daily.region })}
      onGuess={guessDaily}
      onGiveUp={giveUpDaily}
      onOver={
        <section className="mx-auto flex max-w-2xl flex-col items-center gap-4 rounded-xl bg-white p-5 text-center shadow dark:bg-slate-800/60">
          <p className={`font-pixel text-sm ${won ? 'text-emerald-600' : 'text-slate-500'}`}>
            {won ? t('gps.mapDone') : t('gps.mapGaveUp', { found: daily.found.length, total: daily.total })}
          </p>
          <dl className="flex gap-5 text-sm">
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
          <div className="flex flex-wrap justify-center gap-2">
            <ShareButton
              text={() =>
                `Pokewwwww ${t('mode.gps.title')} ${daily.key} · ${daily.found.length}/${daily.total}${
                  daily.wrong.length ? ` · ${t('gps.shareMisses', { count: daily.wrong.length })}` : ''
                }\n${shareRow(daily)}`
              }
            />
            <button type="button" className={btnPrimary} onClick={() => setMode('unlimited')}>
              {t('puz.playUnlimited')}
            </button>
          </div>
          <p className="text-xs text-slate-500">{t('gps.tomorrow')}</p>
        </section>
      }
    />
  );
}
