import { useEffect, useMemo } from 'react';
import { POKEDEX, getPool } from '../../data';
import FilterPanel from '../../components/FilterPanel';
import { availableLengths } from '../../lib/wordle';
import { todayKey } from '../../lib/rng';
import { roundKey, useWordleStore, type WordleMode } from './store';

export default function Setup() {
  const { settings, setSettings, play, rounds } = useWordleStore();
  const daily = settings.mode === 'daily';

  const lengths = useMemo(
    () => availableLengths(daily ? POKEDEX : getPool({ generations: settings.generations })),
    [daily, settings.generations],
  );

  // Keep the chosen length valid when the generation filter changes.
  useEffect(() => {
    if (lengths.length && !lengths.some((l) => l.length === settings.length)) {
      const nearest = lengths.reduce((a, b) =>
        Math.abs(b.length - settings.length) < Math.abs(a.length - settings.length) ? b : a,
      );
      setSettings({ length: nearest.length });
    }
  }, [lengths, settings.length, setSettings]);

  const opt = (on: boolean) =>
    `rounded-lg border px-4 py-2 text-sm font-semibold transition ${
      on
        ? 'border-red-600 bg-red-600 text-white'
        : 'border-slate-300 bg-white hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800'
    }`;

  const modeBtn = (m: WordleMode, label: string) => (
    <button type="button" className={opt(settings.mode === m)} aria-pressed={settings.mode === m} onClick={() => setSettings({ mode: m })}>
      {label}
    </button>
  );

  const existing = rounds[roundKey(settings.mode, settings.length)];
  const resumeLabel =
    daily && existing?.key === todayKey()
      ? existing.status === 'playing'
        ? 'Continue'
        : 'See result'
      : 'Play';

  return (
    <section className="space-y-6 rounded-xl bg-white p-6 shadow dark:bg-slate-800/60">
      <header>
        <h1 className="font-pixel text-xl">Pokédle</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Guess the Pokémon name letter by letter. Green means right letter, right spot; yellow means it&apos;s
          somewhere else in the name. Spaces and punctuation are dropped (Mr. Mime → MRMIME).
        </p>
      </header>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Mode</h2>
        <div className="flex flex-wrap gap-2">
          {modeBtn('daily', 'Daily')}
          {modeBtn('unlimited', 'Unlimited')}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {daily ? 'One name per length per day, from every generation. Same for everyone.' : 'A new random name each time.'}
        </p>
      </div>

      {!daily && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Generations</h2>
          <FilterPanel value={settings.generations} onChange={(generations) => setSettings({ generations })} />
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Letters</h2>
        <div className="flex flex-wrap gap-2">
          {lengths.map(({ length, pool }) => (
            <button
              key={length}
              type="button"
              className={`${opt(settings.length === length)} flex flex-col items-center leading-tight`}
              aria-pressed={settings.length === length}
              onClick={() => setSettings({ length })}
            >
              <span className="text-lg">{length}</span>
              <span className="text-[11px] font-normal opacity-80">{pool.length} Pokémon</span>
            </button>
          ))}
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 accent-red-600"
          checked={settings.strict}
          onChange={(e) => setSettings({ strict: e.target.checked })}
        />
        Strict: every guess must be a real Pokémon name
      </label>

      <div className="flex justify-end border-t border-slate-200 pt-5 dark:border-slate-700">
        <button
          type="button"
          onClick={play}
          className="rounded-lg bg-red-600 px-6 py-2.5 font-semibold text-white shadow hover:bg-red-700"
        >
          {resumeLabel}
        </button>
      </div>
    </section>
  );
}
