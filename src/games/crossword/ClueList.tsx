import { useT } from '../../i18n';
import { useEffect, useRef } from 'react';
import Sprite from '../../components/Sprite';
import type { Dir, Placement } from '../../lib/crossword/generator';

interface Props {
  placements: Placement[];
  activeId: number | null;
  solvedIds: ReadonlySet<number>;
  showSilhouettes: boolean;
  onSelect: (id: number) => void;
}

export default function ClueList({ placements, activeId, solvedIds, showSilhouettes, onSelect }: Props) {
  const { t } = useT();
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
      {(['across', 'down'] as Dir[]).map((dir) => (
        <section key={dir}>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">{t(dir === 'across' ? 'cw.across' : 'cw.down')}</h2>
          <ol className="space-y-0.5">
            {placements
              .filter((p) => p.dir === dir)
              .map((p) => (
                <ClueItem
                  key={p.id}
                  p={p}
                  active={p.id === activeId}
                  solved={solvedIds.has(p.id)}
                  showSilhouette={showSilhouettes}
                  onSelect={onSelect}
                />
              ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function ClueItem({
  p,
  active,
  solved,
  showSilhouette,
  onSelect,
}: {
  p: Placement;
  active: boolean;
  solved: boolean;
  showSilhouette: boolean;
  onSelect: (id: number) => void;
}) {
  const { t } = useT();
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  return (
    <li ref={ref}>
      <button
        type="button"
        onClick={() => onSelect(p.id)}
        className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm transition ${
          active ? 'bg-amber-200 dark:bg-amber-700/60' : 'hover:bg-slate-200/70 dark:hover:bg-slate-700/60'
        }`}
      >
        <span className="w-6 shrink-0 text-right font-bold tabular-nums">{p.number}</span>
        <span className={`flex-1 ${solved ? 'text-slate-400 line-through dark:text-slate-500' : ''}`}>{p.clue}</span>
        {solved ? (
          <span className="flex shrink-0 items-center">
            <Sprite id={p.pokemonId} scale={0.5} />
            <span className="text-emerald-600" aria-label={t('cw.solvedLabel')}>✓</span>
          </span>
        ) : (
          showSilhouette && <Sprite id={p.pokemonId} scale={0.5} silhouette className="shrink-0 opacity-70" />
        )}
      </button>
    </li>
  );
}
