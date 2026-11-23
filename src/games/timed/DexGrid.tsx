import { useT } from '../../i18n';
import { memo, useMemo } from 'react';
import { byId, REGIONS, type Pokemon } from '../../data';
import Sprite from '../../components/Sprite';

type CellState = 'found' | 'hidden' | 'missed';

interface Props {
  scopeIds: number[];
  found: ReadonlySet<number>;
  ended: boolean;
  silhouettes: boolean;
  lastId: number | null;
}

const Cell = memo(function Cell({
  p,
  state,
  silhouettes,
  isLast,
}: {
  p: Pokemon;
  state: CellState;
  silhouettes: boolean;
  isLast: boolean;
}) {
  const base = 'flex h-[74px] flex-col items-center justify-center rounded-md border text-center';
  if (state === 'hidden') {
    return (
      <div className={`${base} border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60`}>
        {silhouettes ? (
          <Sprite id={p.id} scale={0.75} silhouette className="opacity-60" />
        ) : (
          <span className="font-mono text-xs text-slate-400">#{p.id}</span>
        )}
      </div>
    );
  }
  const missed = state === 'missed';
  return (
    <div
      className={`${base} ${
        missed
          ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40'
          : 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40'
      } ${isLast ? 'animate-pop ring-2 ring-emerald-500' : ''}`}
      title={`#${p.id} ${p.name}`}
    >
      <Sprite id={p.id} scale={0.75} className={missed ? 'opacity-50 grayscale' : ''} />
      <span
        className={`w-full truncate px-0.5 text-[10px] leading-tight ${
          missed ? 'text-red-700 dark:text-red-300' : 'text-emerald-800 dark:text-emerald-200'
        }`}
      >
        {p.name}
      </span>
    </div>
  );
});

/** All Pokémon in scope, grouped by generation. */
export default memo(function DexGrid({ scopeIds, found, ended, silhouettes, lastId }: Props) {
  const { t } = useT();
  const groups = useMemo(() => {
    const m = new Map<number, Pokemon[]>();
    for (const id of scopeIds) {
      const p = byId.get(id)!;
      m.set(p.generation, [...(m.get(p.generation) ?? []), p]);
    }
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [scopeIds]);

  return (
    <div className="space-y-6">
      {groups.map(([gen, list]) => {
        const n = list.filter((p) => found.has(p.id)).length;
        return (
          <section key={gen}>
            <h3 className="mb-2 flex items-baseline justify-between text-sm font-semibold">
              <span>
                {t('status.gen', { n: gen })} · {REGIONS[gen]}
              </span>
              <span className="tabular-nums text-slate-500">
                {n} / {list.length}
              </span>
            </h3>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-1.5">
              {list.map((p) => (
                <Cell
                  key={p.id}
                  p={p}
                  state={found.has(p.id) ? 'found' : ended ? 'missed' : 'hidden'}
                  silhouettes={silhouettes}
                  isLast={p.id === lastId}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
});
