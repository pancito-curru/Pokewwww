import { useMemo, type ReactNode } from 'react';
import PokemonInput from '../../components/PokemonInput';
import Sprite from '../../components/Sprite';
import TypeBadge from '../../components/TypeBadge';
import { byId } from '../../data';
import { useT } from '../../i18n';
import { MAX_WRONG, levelsAt, membersOf, type LocationData, type MapRound } from '../../lib/gps';
import { GiveUp } from '../puzzle/Chrome';

/**
 * One place: its name, a slot for every Pokémon that appears there (with its types as a hint),
 * and the input to name them. `onOver` is what shows once the map is finished.
 */
export default function MapBoard({
  data,
  map,
  heading,
  onGuess,
  onGiveUp,
  onOver,
  footer,
}: {
  data: LocationData;
  map: MapRound;
  /** Small line above the place's name, e.g. "You are in Kanto". */
  heading: string;
  onGuess: (id: number, inMap: boolean) => void;
  onGiveUp: () => void;
  onOver: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useT();
  const members = useMemo(() => membersOf(data, map.loc), [data, map.loc]);
  const [name] = data.locations[map.loc];
  const over = map.status !== 'playing';
  const known = useMemo(() => new Set([...map.found, ...map.wrong]), [map.found, map.wrong]);

  return (
    <div className="space-y-5">
      <section className="mx-auto max-w-2xl rounded-2xl bg-white p-4 shadow-lg dark:bg-slate-800 sm:p-6">
        <p className="text-center text-xs font-semibold uppercase tracking-wide text-slate-500">{heading}</p>
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
                    {lv && (
                      <span className="text-slate-500">
                        {lv[0] === lv[1] ? t('gps.level', { n: lv[0] }) : t('gps.levels', { min: lv[0], max: lv[1] })}
                      </span>
                    )}
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
          <PokemonInput onSelect={(id) => onGuess(id, members.includes(id))} exclude={known} />
          <div className="flex items-center gap-3 py-2.5 text-sm">
            <span className="tabular-nums text-slate-600 dark:text-slate-300" aria-live="polite">
              {t('gps.tries', { n: map.wrong.length, max: MAX_WRONG })}
            </span>
            <GiveUp onConfirm={onGiveUp} />
          </div>
        </div>
      ) : (
        onOver
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

      {!over && footer}
    </div>
  );
}
