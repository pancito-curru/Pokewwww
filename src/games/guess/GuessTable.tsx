import { memo, type ReactNode } from 'react';
import { byId, type Pokemon } from '../../data';
import Sprite from '../../components/Sprite';
import { COLUMNS, compare, type CellResult, type ColumnKey } from '../../lib/compare';

const GRID = 'grid grid-cols-[8.5rem_repeat(9,4.75rem)] gap-1';

const SWATCH: Record<string, string> = {
  black: '#1f2937', blue: '#3b82f6', brown: '#92400e', gray: '#9ca3af', green: '#22c55e',
  pink: '#f472b6', purple: '#a855f7', red: '#ef4444', white: '#f8fafc', yellow: '#facc15',
};

const STYLE: Record<CellResult, string> = {
  match: 'bg-emerald-500 text-white',
  partial: 'bg-amber-400 text-slate-900',
  miss: 'bg-rose-500 text-white',
  higher: 'bg-rose-500 text-white',
  lower: 'bg-rose-500 text-white',
};

const ICON: Record<CellResult, string> = { match: '✓', partial: '~', miss: '✗', higher: '▲', lower: '▼' };
const SR: Record<CellResult, string> = {
  match: 'correct',
  partial: 'right type, wrong slot',
  miss: 'wrong',
  higher: 'target is higher',
  lower: 'target is lower',
};

const title = (s: string) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function value(key: ColumnKey, p: Pokemon): ReactNode {
  switch (key) {
    case 'type1':
      return title(p.types[0]);
    case 'type2':
      return p.types[1] ? title(p.types[1]) : 'None';
    case 'generation':
      return (
        <>
          Gen {p.generation}
          <span className="block text-[10px] opacity-80">{p.region}</span>
        </>
      );
    case 'color':
      return (
        <>
          <span
            className="mx-auto mb-0.5 block h-3 w-3 rounded-full border border-black/20"
            style={{ background: SWATCH[p.color] ?? 'transparent' }}
          />
          {title(p.color)}
        </>
      );
    case 'shape':
      return p.shape ? title(p.shape) : '—';
    case 'evoStage':
      return `Stage ${p.evoStage}`;
    case 'height':
      return `${p.height} m`;
    case 'weight':
      return `${p.weight} kg`;
    case 'category':
      return title(p.category);
  }
}

const Row = memo(function Row({ guess, target }: { guess: Pokemon; target: Pokemon }) {
  const cells = compare(guess, target);
  return (
    <div className={GRID}>
      <div className="flex items-center gap-1 rounded-md bg-white px-1 shadow-sm dark:bg-slate-800">
        <Sprite id={guess.id} scale={0.75} />
        <span className="truncate text-xs font-semibold">{guess.name}</span>
      </div>
      {cells.map((c, i) => (
        <div
          key={c.key}
          className={`relative flex min-h-[3.75rem] animate-flip flex-col items-center justify-center rounded-md px-1 text-center text-xs font-semibold leading-tight ${STYLE[c.result]}`}
          style={{ animationDelay: `${i * 90}ms` }}
        >
          <span aria-hidden className="absolute right-1 top-0.5 text-[10px] opacity-90">
            {ICON[c.result]}
          </span>
          <span>{value(c.key, guess)}</span>
          <span className="sr-only">: {SR[c.result]}</span>
        </div>
      ))}
    </div>
  );
});

/** Guess history, newest on top. */
export default function GuessTable({ guesses, targetId }: { guesses: number[]; targetId: number }) {
  if (!guesses.length) return null;
  const target = byId.get(targetId)!;
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2">
      <div className="w-max space-y-1">
        <div className={`${GRID} text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500`}>
          <div className="text-left">Pokémon</div>
          {COLUMNS.map((c) => (
            <div key={c.key}>{c.label}</div>
          ))}
        </div>
        {[...guesses].reverse().map((id) => (
          <Row key={id} guess={byId.get(id)!} target={target} />
        ))}
      </div>
    </div>
  );
}

export function Legend() {
  const item = (cls: string, icon: string, text: string) => (
    <span className="flex items-center gap-1.5">
      <span className={`inline-flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold ${cls}`}>{icon}</span>
      {text}
    </span>
  );
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
      {item(STYLE.match, ICON.match, 'Match')}
      {item(STYLE.partial, ICON.partial, 'Type is in the other slot')}
      {item(STYLE.miss, ICON.miss, 'Different')}
      {item(STYLE.higher, '▲▼', "Target's value is higher / lower")}
    </div>
  );
}
