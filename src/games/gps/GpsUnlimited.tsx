import { useMemo } from 'react';
import { useT } from '../../i18n';
import { mapsFor, pickMap, regionsOf, type LocationData } from '../../lib/gps';
import { mulberry32, randomSeed } from '../../lib/rng';
import { btnPrimary, btnSecondary } from '../puzzle/Chrome';
import MapBoard from './MapBoard';
import { useGpsStore } from './store';

/** Unlimited: pick a region, then play its places one after another. */
export default function GpsUnlimited({ data }: { data: LocationData }) {
  const { t } = useT();
  const region = useGpsStore((s) => s.region);
  const map = useGpsStore((s) => s.map);
  const stats = useGpsStore((s) => s.stats);
  const regions = useMemo(() => regionsOf(data), [data]);

  const startMap = (r: string, current?: number) => {
    const { visited, start } = useGpsStore.getState();
    const maps = mapsFor(data, r);
    const seen = visited[r] ?? [];
    const loc = pickMap(maps, seen, mulberry32(randomSeed()), current);
    if (loc === null) return;
    start(r, loc, maps.find((m) => m.loc === loc)!.count, maps.every((m) => seen.includes(m.loc)));
  };

  return (
    <div className="space-y-5">
      {!region || !map ? (
        <RegionPicker data={data} regions={regions} onPick={(r) => startMap(r)} />
      ) : (
        <MapBoard
          key={map.loc}
          data={data}
          map={map}
          heading={t('gps.youAreIn', { region: map.region })}
          onGuess={useGpsStore.getState().guess}
          onGiveUp={useGpsStore.getState().giveUp}
          onOver={
            <section className="mx-auto flex max-w-2xl flex-col items-center gap-3 rounded-xl bg-white p-5 text-center shadow dark:bg-slate-800/60">
              <p className={`font-pixel text-sm ${map.status === 'done' ? 'text-emerald-600' : 'text-slate-500'}`}>
                {map.status === 'done' ? t('gps.mapDone') : t('gps.mapGaveUp', { found: map.found.length, total: map.total })}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button type="button" className={btnPrimary} onClick={() => startMap(region, map.loc)}>
                  {t('gps.nextMap')}
                </button>
                <button type="button" className={btnSecondary} onClick={() => useGpsStore.getState().setRegion(null)}>
                  {t('gps.changeRegion')}
                </button>
              </div>
            </section>
          }
          footer={
            <p className="text-center text-xs text-slate-500">
              <button type="button" className="underline" onClick={() => useGpsStore.getState().setRegion(null)}>
                {t('gps.changeRegion')}
              </button>
            </p>
          }
        />
      )}

      {stats.maps > 0 && (
        <p className="text-center text-xs text-slate-500">{t('gps.statsLine', { maps: stats.maps, pokemon: stats.pokemon })}</p>
      )}
    </div>
  );
}

function RegionPicker({ data, regions, onPick }: { data: LocationData; regions: string[]; onPick: (r: string) => void }) {
  const { t } = useT();
  const perRegion = useGpsStore((s) => s.stats.perRegion);
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t('gps.pickRegion')}</h2>
      <div className="grid gap-2 sm:grid-cols-3">
        {regions.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onPick(r)}
            className="rounded-xl border border-slate-300 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-red-500 hover:shadow dark:border-slate-600 dark:bg-slate-800"
          >
            <span className="block font-pixel text-sm">{r}</span>
            <span className="mt-1 block text-xs text-slate-500">
              {t('gps.placesN', { n: mapsFor(data, r).length })}
              {perRegion[r] ? ` · ${t('gps.completedN', { n: perRegion[r] })}` : ''}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
