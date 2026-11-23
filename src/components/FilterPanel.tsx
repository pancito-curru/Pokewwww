import { useT } from '../i18n';
import { GENERATIONS, REGIONS, getPool } from '../data';

interface Props {
  /** Selected generations; empty = all. */
  value: number[];
  onChange: (gens: number[]) => void;
}

const counts = new Map<number, number>(GENERATIONS.map((g) => [g, getPool({ generations: [g] }).length]));

const chip = (on: boolean) =>
  `rounded-lg border px-3 py-1.5 text-left text-sm transition ${
    on
      ? 'border-red-600 bg-red-600 text-white'
      : 'border-slate-300 bg-white hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-slate-500'
  }`;

/** Generation picker shared by every mode. */
export default function FilterPanel({ value, onChange }: Props) {
  const { t } = useT();
  const all = value.length === 0;
  const toggle = (g: number) => {
    const next = value.includes(g) ? value.filter((x) => x !== g) : [...value, g].sort((a, b) => a - b);
    onChange(next.length === GENERATIONS.length ? [] : next);
  };

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t('filter.label')}>
      <button type="button" className={chip(all)} aria-pressed={all} onClick={() => onChange([])}>
        <span className="font-semibold">{t('filter.all')}</span>
        <span className="ml-2 opacity-75">{getPool().length}</span>
      </button>
      {GENERATIONS.map((g) => {
        const on = value.includes(g);
        return (
          <button key={g} type="button" className={chip(on)} aria-pressed={on} onClick={() => toggle(g)}>
            <span className="font-semibold">{t('filter.gen', { n: g })}</span>
            <span className="ml-1.5 opacity-75">
              {REGIONS[g]} · {counts.get(g)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
