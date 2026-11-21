import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { byId } from '../../data';
import FilterPanel from '../../components/FilterPanel';
import PokemonInput from '../../components/PokemonInput';
import ShareButton from '../../components/ShareButton';
import Sprite from '../../components/Sprite';
import Timer from '../../components/Timer';
import TypeBadge from '../../components/TypeBadge';
import { attemptEmoji, MAX_ATTEMPTS, RUN_DURATIONS, runKey, summarize, type RunItem } from '../../lib/identify';
import { todayKey } from '../../lib/rng';
import { getPool, type Pokemon } from '../../data';
import { KINDS, type IdentifyKind } from './kinds';
import { identifyStores } from './store';
import Prompt from './Prompt';

/** How long a revealed answer stays up before the run moves on. */
const REVEAL_MS = { correct: 1100, missed: 2200, skipped: 1800 } as const;

const primary = 'rounded-lg bg-red-600 px-5 py-2.5 font-semibold text-white shadow hover:bg-red-700';
const secondary =
  'rounded-lg border border-slate-300 px-4 py-2 font-semibold hover:border-slate-400 disabled:opacity-40 dark:border-slate-600';

export default function IdentifyGame({ kind }: { kind: IdentifyKind }) {
  const useStore = identifyStores[kind];
  const screen = useStore((s) => s.screen);
  const mode = useStore((s) => s.settings.mode);
  const daily = useStore((s) => s.daily);
  const run = useStore((s) => s.run);

  if (screen === 'setup') return <Setup kind={kind} />;
  if (mode === 'daily') return daily?.key === todayKey() ? <Daily kind={kind} /> : <Setup kind={kind} />;
  if (!run) return <Setup kind={kind} />;
  return run.status === 'playing' ? <RunView kind={kind} /> : <RunResults kind={kind} />;
}

/* ---------------------------------- Setup --------------------------------- */

function Setup({ kind }: { kind: IdentifyKind }) {
  const info = KINDS[kind];
  const useStore = identifyStores[kind];
  const { settings, setSettings, openDaily, startRun, daily, run, dailyStats, best } = useStore();
  const isDaily = settings.mode === 'daily';
  const poolSize = getPool({ generations: settings.generations }).length;
  const record = best[runKey(settings.generations, settings.minutes)];
  const today = daily?.key === todayKey() ? daily : null;
  const runInProgress = run?.status === 'playing' && Date.now() < run.endsAt;

  const opt = (on: boolean) =>
    `rounded-lg border px-4 py-2 text-sm font-semibold transition ${
      on
        ? 'border-red-600 bg-red-600 text-white'
        : 'border-slate-300 bg-white hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800'
    }`;

  return (
    <section className="space-y-6 rounded-xl bg-white p-6 shadow dark:bg-slate-800/60">
      <header>
        <h1 className="font-pixel text-xl">{info.title}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{info.intro}</p>
      </header>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Mode</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ['daily', 'Pokémon of the day', 'One Pokémon, the same for everyone today. 3 tries.'],
              ['run', 'Timed run', 'Pick regions and a time limit, then name as many as you can.'],
            ] as const
          ).map(([m, title, hint]) => (
            <button
              key={m}
              type="button"
              aria-pressed={settings.mode === m}
              onClick={() => setSettings({ mode: m })}
              className={`${opt(settings.mode === m)} text-left`}
            >
              <span className="block">{title}</span>
              <span className="block text-xs font-normal opacity-80">{hint}</span>
            </button>
          ))}
        </div>
      </div>

      {!isDaily && (
        <>
          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Regions</h2>
            <FilterPanel value={settings.generations} onChange={(generations) => setSettings({ generations })} />
          </div>
          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Time</h2>
            <div className="flex flex-wrap gap-2">
              {RUN_DURATIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={opt(settings.minutes === m)}
                  aria-pressed={settings.minutes === m}
                  onClick={() => setSettings({ minutes: m })}
                >
                  {m} min
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-5 dark:border-slate-700">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {isDaily ? (
            today?.item.result ? (
              <>Today&apos;s done{dailyStats.streak ? ` · ${dailyStats.streak}-day streak` : ''}</>
            ) : (
              <>
                Played {dailyStats.played} · won {dailyStats.wins}
                {dailyStats.streak ? ` · ${dailyStats.streak}-day streak` : ''}
              </>
            )
          ) : (
            <>
              <strong>{poolSize}</strong> Pokémon in the pool
              {record && <span className="ml-3">· Best: {record.correct}</span>}
            </>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          {!isDaily && runInProgress && (
            <button type="button" className={secondary} onClick={() => useStore.setState({ screen: 'game' })}>
              Resume run
            </button>
          )}
          <button type="button" className={primary} onClick={isDaily ? openDaily : startRun}>
            {isDaily ? (today?.item.result ? 'See today’s result' : today ? 'Continue' : 'Play') : 'Start run'}
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------- Daily --------------------------------- */

function Daily({ kind }: { kind: IdentifyKind }) {
  const info = KINDS[kind];
  const useStore = identifyStores[kind];
  const daily = useStore((s) => s.daily)!;
  const stats = useStore((s) => s.dailyStats);
  const { guessDaily, toSetup, setSettings } = useStore.getState();
  const { item } = daily;
  const target = byId.get(item.id)!;
  const done = !!item.result;
  const won = item.result === 'correct';
  const [message, setMessage] = useState<string | null>(null);
  const exclude = useMemo(() => new Set(item.wrong), [item.wrong]);

  const onGuess = (id: number) => {
    const outcome = guessDaily(id);
    const left = MAX_ATTEMPTS - (useStore.getState().daily!.item.wrong.length);
    if (outcome === 'wrong') setMessage(`Not ${byId.get(id)!.name}. ${left} ${left === 1 ? 'try' : 'tries'} left.`);
    else setMessage(null);
  };

  return (
    <div className="space-y-5">
      <Header title={info.title} subtitle={`Pokémon of the day · ${daily.key}`} onBack={toSetup} />

      <Prompt kind={kind} id={item.id} revealed={done} outcome={item.result} />

      {!done && (
        <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
          <Tries used={item.wrong.length} />
          <PokemonInput onSelect={onGuess} exclude={exclude} showSprites={kind !== 'silhouette'} />
          {message && <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{message}</p>}
          <DailyHints wrong={item.wrong.length} target={target} />
        </div>
      )}

      {item.wrong.length > 0 && <WrongList ids={item.wrong} />}

      {done && (
        <section className="mx-auto flex max-w-sm flex-col items-center gap-4 rounded-xl bg-white p-5 text-center shadow dark:bg-slate-800/60">
          <p className="font-pixel text-sm">{won ? `Got it in ${item.wrong.length + 1}!` : 'Out of tries'}</p>
          <dl className="flex gap-5 text-sm">
            {[
              ['Played', stats.played],
              ['Win %', stats.played ? Math.round((stats.wins / stats.played) * 100) : 0],
              ['Streak', stats.streak],
              ['Best', stats.maxStreak],
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
                `Pokewwww ${info.title} ${daily.key} · ${won ? item.wrong.length + 1 : 'X'}/${MAX_ATTEMPTS}\n${attemptEmoji(
                  item.wrong.length,
                  won,
                )}`
              }
            />
            <button
              type="button"
              className={primary}
              onClick={() => {
                setSettings({ mode: 'run' });
                toSetup();
              }}
            >
              Try a timed run
            </button>
          </div>
          <p className="text-xs text-slate-500">A new Pokémon of the day comes tomorrow.</p>
        </section>
      )}
    </div>
  );
}

/** Small hints that appear after wrong daily guesses. */
function DailyHints({ wrong, target }: { wrong: number; target: Pokemon }) {
  if (!wrong) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-300">
      <span className="font-semibold">Hint:</span>
      <span>
        Gen {target.generation} · {target.region}
      </span>
      {wrong >= 2 && target.types.map((t) => <TypeBadge key={t} type={t} />)}
    </div>
  );
}

/* ----------------------------------- Run ---------------------------------- */

function RunView({ kind }: { kind: IdentifyKind }) {
  const info = KINDS[kind];
  const useStore = identifyStores[kind];
  const run = useStore((s) => s.run)!;
  const { guessRun, skipRun, nextRun, endRun } = useStore.getState();
  const current = run.items[run.items.length - 1];
  const summary = summarize(run.items);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const exclude = useMemo(() => new Set(current.wrong), [current.wrong]);
  const nextRef = useRef<HTMLButtonElement>(null);

  // Show the answer for a moment, then move on.
  useEffect(() => {
    if (!run.revealing || !current.result) return;
    nextRef.current?.focus();
    const t = setTimeout(nextRun, REVEAL_MS[current.result]);
    return () => clearTimeout(t);
  }, [run.revealing, current.result, current.id, nextRun]);

  useEffect(() => setMessage(null), [current.id]);

  const onGuess = (id: number) => {
    const outcome = guessRun(id);
    const left = MAX_ATTEMPTS - (current.wrong.length + 1);
    if (outcome === 'wrong') setMessage(`Not ${byId.get(id)!.name}. ${left} ${left === 1 ? 'try' : 'tries'} left.`);
    else setMessage(null);
  };

  const onExpire = useCallback(() => endRun(), [endRun]);
  const gens = run.generations.length ? `Gen ${run.generations.join(', ')}` : 'All regions';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div>
          <h1 className="font-pixel text-lg">{info.title}</h1>
          <p className="mt-1 text-xs text-slate-500">
            Timed run · {gens} · {run.minutes} min
          </p>
        </div>
        <div className="text-2xl font-bold tabular-nums" aria-live="polite">
          {summary.correct}
          <span className="ml-1 text-sm font-normal text-slate-500">correct</span>
        </div>
        <Timer startedAt={run.startedAt} endsAt={run.endsAt} onExpire={onExpire} />
        <div className="ml-auto">
          {confirmEnd ? (
            <span className="flex items-center gap-2 text-sm">
              End the run?
              <button type="button" className="rounded bg-red-600 px-3 py-1.5 font-semibold text-white" onClick={endRun}>
                Yes
              </button>
              <button type="button" className={secondary} onClick={() => setConfirmEnd(false)}>
                No
              </button>
            </span>
          ) : (
            <button type="button" className={secondary} onClick={() => setConfirmEnd(true)}>
              End run
            </button>
          )}
        </div>
      </div>

      <Prompt
        kind={kind}
        id={current.id}
        revealed={run.revealing}
        outcome={current.result}
        preload={run.order.slice(run.items.length, run.items.length + 2)}
      />

      <div className="mx-auto flex min-h-[7rem] max-w-sm flex-col items-center gap-3">
        {run.revealing ? (
          <>
            <p
              className={`font-semibold ${
                current.result === 'correct' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {current.result === 'correct' ? 'Correct!' : current.result === 'missed' ? 'Out of tries.' : 'Skipped.'}
            </p>
            <button ref={nextRef} type="button" className={primary} onClick={nextRun}>
              Next →
            </button>
          </>
        ) : (
          <>
            <Tries used={current.wrong.length} />
            <div className="flex w-full items-start gap-2">
              <PokemonInput key={current.id} onSelect={onGuess} exclude={exclude} showSprites={kind !== 'silhouette'} />
              <button type="button" className={`${secondary} shrink-0 py-2.5`} onClick={skipRun}>
                Skip
              </button>
            </div>
            {message && <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{message}</p>}
          </>
        )}
      </div>
    </div>
  );
}

function RunResults({ kind }: { kind: IdentifyKind }) {
  const info = KINDS[kind];
  const useStore = identifyStores[kind];
  const run = useStore((s) => s.run)!;
  const best = useStore((s) => s.best[runKey(run.generations, run.minutes)]);
  const { startRun, toSetup, setSettings } = useStore.getState();
  const summary = summarize(run.items);
  const gens = run.generations.length ? `Gen ${run.generations.join(', ')}` : 'All regions';
  const notGot = run.items.filter((i) => i.result !== 'correct');

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white p-6 shadow dark:bg-slate-800/60">
        <h1 className="font-pixel text-xl">Time&apos;s up!</h1>
        <p className="mt-1 text-sm text-slate-500">
          {info.title} · {gens} · {run.minutes} min
        </p>
        {run.newBest && (
          <p className="mt-2 inline-block rounded bg-amber-100 px-2 py-0.5 text-sm font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
            New personal best!
          </p>
        )}
        <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(
            [
              ['Correct', summary.correct],
              ['First try', summary.firstTry],
              ['Missed', summary.missed],
              ['Skipped', summary.skipped],
            ] as const
          ).map(([label, v]) => (
            <div key={label} className="rounded-lg bg-slate-100 p-3 dark:bg-slate-900/60">
              <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
              <dd className="mt-1 text-xl font-bold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        {best && !run.newBest && <p className="mt-4 text-sm text-slate-500">Best for this setup: {best.correct}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            className={primary}
            onClick={() => {
              setSettings({ generations: run.generations, minutes: run.minutes });
              startRun();
            }}
          >
            Play again
          </button>
          <button type="button" className={secondary} onClick={toSetup}>
            Change settings
          </button>
          <ShareButton
            text={() =>
              `Pokewwww ${info.title} · ${gens} · ${run.minutes} min\n✅ ${summary.correct} correct${
                summary.missed + summary.skipped ? ` · ${summary.missed + summary.skipped} missed` : ''
              }`
            }
          />
        </div>
      </section>

      {notGot.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">The ones you missed</h2>
          <ResultGrid items={notGot} />
        </section>
      )}
      {summary.correct > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">The ones you got</h2>
          <ResultGrid items={run.items.filter((i) => i.result === 'correct')} />
        </section>
      )}
    </div>
  );
}

/* --------------------------------- Shared --------------------------------- */

function Header({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="font-pixel text-lg">{title}</h1>
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      </div>
      <button type="button" className={secondary} onClick={onBack}>
        Options
      </button>
    </div>
  );
}

function Tries({ used }: { used: number }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500" aria-label={`${MAX_ATTEMPTS - used} tries left`}>
      {Array.from({ length: MAX_ATTEMPTS }, (_, i) => (
        <span
          key={i}
          className={`h-3 w-3 rounded-full ${i < used ? 'bg-rose-400' : 'bg-emerald-400'}`}
          aria-hidden
        />
      ))}
      <span>
        {MAX_ATTEMPTS - used} {MAX_ATTEMPTS - used === 1 ? 'try' : 'tries'} left
      </span>
    </div>
  );
}

function WrongList({ ids }: { ids: number[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {ids.map((id) => (
        <span
          key={id}
          className="flex items-center gap-1 rounded-full bg-rose-50 py-0.5 pl-1 pr-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
        >
          <Sprite id={id} scale={0.5} /> ✗ {byId.get(id)!.name}
        </span>
      ))}
    </div>
  );
}

function ResultGrid({ items }: { items: RunItem[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2">
      {items.map((i) => (
        <div
          key={i.id}
          className={`flex flex-col items-center rounded-md border p-1 text-center ${
            i.result === 'correct'
              ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40'
              : 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40'
          }`}
        >
          <Sprite id={i.id} />
          <span className="w-full truncate text-[11px]">{byId.get(i.id)!.name}</span>
          <span className="text-[10px] text-slate-500">
            {i.result === 'correct' ? (i.wrong.length ? `${i.wrong.length + 1} tries` : 'first try') : i.result}
          </span>
        </div>
      ))}
    </div>
  );
}
