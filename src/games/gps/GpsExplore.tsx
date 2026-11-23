import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PokemonInput from '../../components/PokemonInput';
import Sprite from '../../components/Sprite';
import TypeBadge from '../../components/TypeBadge';
import { byId } from '../../data';
import { useT } from '../../i18n';
import { levelsAt, mapsFor, membersOf, pickMap, regionsOf, type LocationData } from '../../lib/gps';
import { randomSeed, mulberry32 } from '../../lib/rng';
import { useGpsStore } from '../puzzle/stores';
import { btnPrimary, btnSecondary, GiveUp, PuzzleHeader } from '../puzzle/Chrome';
import { useExploreStore } from './exploreStore';

export default function GpsExplore({ data }: { data: LocationData }) {
  const { t } = useT();
  const navigate = useNavigate();
  const { setMode } = useGpsStore.getState();
  const region = useExploreStore((s) => s.region);
  const map = useExploreStore((s) => s.map);
  const stats = useExploreStore((s) => s.stats);

  const regions = useMemo(() => regionsOf(data), [data]);

  const startMap = (r: string, current?: number) => {
    const { visited, start } = useExploreStore.getState();
    const maps = mapsFor(data, r);
    const seen = visited[r] ?? [];
    const loc = pickMap(maps, seen, mulberry32(randomSeed()), current);
    if (loc === null) return;
    const fresh = maps.every((m) => seen.includes(m.loc));
    start(r, loc, maps.find((m) => m.loc === loc)!.count, fresh);
  };

  return (
    <div className="space-y-5">
      <PuzzleHeader
        title={t('mode.gps.title')}
        intro={t('gps.exploreIntro')}
        mode="daily"
        onMode={(m) => {
          setMode(m);
          navigate('/gps');
        }}
        explore={{ label: t('gps.explore'), active: true, onSelect: () => undefined }}
      />

      {!region || !map ? (
        <RegionPicker data={data} regions={regions} onPick={(r) => startMap(r)} />
      ) : (
        <MapView
          key={map.loc}
          data={data}
          onNext={() => startMap(region, map.loc)}
          onRegion={() => useExploreStore.getState().setRegion(null)}
        />
      )}

      {stats.maps > 0 && (
        <p className="text-center text-xs text-slate-500">
          {t('gps.statsLine', { maps: stats.maps, pokemon: stats.pokemon })}
        </p>
      )}
    </div>
  );
}

function RegionPicker({ data, regions, onPick }: { data: LocationData; regions: string[]; onPick: (r: string) => void }) {
  const { t } = useT();
  const perRegion = useExploreStore((s) => s.stats.perRegion);
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

function MapView({ data, onNext, onRegion }: { data: LocationData; onNext: () => void; onRegion: () => void }) {
  const { t } = useT();
  const map = useExploreStore((s) => s.map)!;
  const { guess, giveUp } = useExploreStore.getState();
  const members = useMemo(() => membersOf(data, map.loc), [data, map.loc]);
  const [name] = data.locations[map.loc];
  const over = map.status !== 'playing';
  const known = useMemo(() => new Set([...map.found, ...map.wrong]), [map.found, map.wrong]);

  const onSelect = (id: number) => guess(id, members.includes(id));

  return (
    <div className="space-y-5">
      <section className="mx-auto max-w-2xl rounded-2xl bg-white p-4 shadow-lg dark:bg-slate-800 sm:p-6">
        <p className="text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t('gps.youAreIn', { region: map.region })}
        </p>
        <h2 className="mt-1 text-center font-pixel text-lg">
          <span aria-hidden>📍</span> {name}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-300" aria-live="polite">
          {t('gps.appearHere', { total: map.total })} · <strong>{map.found.length}</strong> / {map.total}
        </p>

        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label={t('gps.slots')}>
          {members.map((id) => {
            const p = byId.get(id)!;
            const found = map.found.includes(id);
            const missed = !found && over;
            const lv = levelsAt(data, id, map.loc);
            return (
              <li
                key={id}
                className={`flex min-h-[5.5rem] flex-col items-center justify-center rounded-lg border p-2 text-center text-xs ${
                  found
                    ? 'animate-pop border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40'
                    : missed
                      ? 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40'
                      : 'border-dashed border-slate-300 dark:border-slate-600'
                }`}
              >
                {found || missed ? (
                  <>
                    <Sprite id={id} scale={0.9} className={missed ? 'opacity-60 grayscale' : ''} />
                    <span className="font-semibold">
                      {found ? '✓' : '✗'} {p.name}
                    </span>
                    {lv && <span className="text-slate-500">{lv[0] === lv[1] ? t('gps.level', { n: lv[0] }) : t('gps.levels', { min: lv[0], max: lv[1] })}</span>}
                  </>
                ) : (
                  <>
                    <span className="text-2xl text-slate-300 dark:text-slate-600" aria-hidden>
                      ?
                    </span>
                    <span className="sr-only">{t('gps.hiddenSlot')}</span>
                    <span className="mt-1 flex flex-wrap justify-center gap-1">
                      {p.types.map((ty) => (
                        <TypeBadge key={ty} type={ty} />
                      ))}
                    </span>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {!over ? (
        <div className="mx-auto flex max-w-2xl flex-wrap items-start gap-3">
          <PokemonInput onSelect={onSelect} exclude={known} />
          <div className="flex items-center gap-2 py-2.5">
            <GiveUp onConfirm={giveUp} />
          </div>
        </div>
      ) : (
        <section className="mx-auto flex max-w-2xl flex-col items-center gap-3 rounded-xl bg-white p-5 text-center shadow dark:bg-slate-800/60">
          <p className={`font-pixel text-sm ${map.status === 'done' ? 'text-emerald-600' : 'text-slate-500'}`}>
            {map.status === 'done' ? t('gps.mapDone') : t('gps.mapGaveUp', { found: map.found.length, total: map.total })}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" className={btnPrimary} onClick={onNext}>
              {t('gps.nextMap')}
            </button>
            <button type="button" className={btnSecondary} onClick={onRegion}>
              {t('gps.changeRegion')}
            </button>
          </div>
        </section>
      )}

      {map.wrong.length > 0 && (
        <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">{t('gps.notHere')}</span>
          {map.wrong.map((id) => (
            <span
              key={id}
              className="flex items-center gap-1 rounded-full bg-rose-50 py-0.5 pl-1 pr-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
            >
              <Sprite id={id} scale={0.5} /> ✗ {byId.get(id)!.name}
            </span>
          ))}
        </div>
      )}

      {!over && (
        <p className="text-center text-xs text-slate-500">
          <button type="button" className="underline" onClick={onRegion}>
            {t('gps.changeRegion')}
          </button>
        </p>
      )}
    </div>
  );
}
