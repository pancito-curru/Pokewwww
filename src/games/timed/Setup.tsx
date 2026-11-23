import { useT } from '../../i18n';
import { getPool } from '../../data';
import FilterPanel from '../../components/FilterPanel';
import { formatClock, scopeKey } from '../../lib/timed';
import { useTimedStore } from './store';
import Switch from '../../components/Switch';

const DURATIONS: (number | null)[] = [5, 10, 15, 30, null];

export default function Setup() {
  const { t } = useT();
  const { settings, setSettings, start, best } = useTimedStore();
  const poolSize = getPool({ generations: settings.generations }).length;
  const record = best[scopeKey(settings.generations, settings.duration, settings.easy)];

  const opt = (on: boolean) =>
    `rounded-lg border px-4 py-2 text-sm font-semibold transition ${
      on
        ? 'border-red-600 bg-red-600 text-white'
        : 'border-slate-300 bg-white hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800'
    }`;

  return (
    <section className="space-y-6 rounded-xl bg-white p-6 shadow dark:bg-slate-800/60">
      <header>
        <h1 className="font-pixel text-xl">{t('mode.timed.title')}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {t('tm.intro')}
        </p>
      </header>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
        <Switch
          checked={!!settings.easy}
          onChange={(easy) => setSettings({ easy })}
          label={t('tm.easy')}
          description={t('tm.easyInfo')}
        />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{t('tm.timer')}</h2>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d ?? 'none'}
              type="button"
              className={opt(settings.duration === d)}
              aria-pressed={settings.duration === d}
              onClick={() => setSettings({ duration: d })}
            >
              {d ? t('status.min', { n: d }) : t('tm.noLimit')}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{t('filter.label')}</h2>
        <FilterPanel value={settings.generations} onChange={(generations) => setSettings({ generations })} />
      </div>

      <label className="flex cursor-pointer items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 accent-red-600"
          checked={settings.silhouettes}
          onChange={(e) => setSettings({ silhouettes: e.target.checked })}
        />
        {t('tm.silhouettes')}
      </label>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-5 dark:border-slate-700">
        <div className="text-sm text-slate-600 dark:text-slate-300">
          {t('tm.toFind', { n: poolSize })}
          {record && (
            <span className="ml-3">
              · {t('tm.best', { found: record.found, total: record.total, time: formatClock(record.ms) })}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={start}
          className="rounded-lg bg-red-600 px-6 py-2.5 font-semibold text-white shadow hover:bg-red-700"
        >
          {t('tm.start')}
        </button>
      </div>
    </section>
  );
}
