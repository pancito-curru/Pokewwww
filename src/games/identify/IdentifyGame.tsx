import { useT } from '../../i18n';
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
import type { IdentifyKind } from './kinds';
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
  const { t } = useT();
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
        <h1 className="font-pixel text-xl">{t(`mode.${kind}.title`)}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t(`id.intro.${kind}`)}</p>
      </header>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{t('set.mode')}</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ['daily', t('mode.daily'), t('id.dailyHint')],
              ['run', t('id.timedRun'), t('id.runHint')],
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
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{t('id.regions')}</h2>
            <FilterPanel value={settings.generations} onChange={(generations) => setSettings({ generations })} />
          </div>
          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{t('id.time')}</h2>
            <div className="flex flex-wrap gap-2">
              {RUN_DURATIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={opt(settings.minutes === m)}
                  aria-pressed={settings.minutes === m}
                  onClick={() => setSettings({ minutes: m })}
                >
                  {t('status.min', { n: m })}
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
              <>{t('id.todayDone')}{dailyStats.streak ? t('status.streak', { n: dailyStats.streak }) : ''}</>
            ) : (
              <>
                {t('id.playedWon', { played: dailyStats.played, wins: dailyStats.wins })}
                {dailyStats.streak ? t('status.streak', { n: dailyStats.streak }) : ''}
              </>
            )
          ) : (
            <>
              {t('id.pool', { n: poolSize })}
              {record && <span className="ml-3">· {t('id.bestN', { n: record.correct })}</span>}
            </>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          {!isDaily && runInProgress && (
            <button type="button" className={secondary} onClick={() => useStore.setState({ screen: 'game' })}>
              {t('id.resume')}
            </button>
          )}
          <button type="button" className={primary} onClick={isDaily ? openDaily : startRun}>
            {isDaily ? (today?.item.result ? t('id.seeResult') : today ? t('cw.continue') : t('cw.play')) : t('id.start')}
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------- Daily --------------------------------- */

function Daily({ kind }: { kind: IdentifyKind }) {
  const { t } = useT();
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
    if (outcome === 'wrong') setMessage(t('id.notIt', { name: byId.get(id)!.name, count: left }));
    else setMessage(null);
  };

  return (
    <div className="space-y-5">
      <Header title={t(`mode.${kind}.title`)} subtitle={`${t('mode.daily')} · ${daily.key}`} onBack={toSetup} />

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
          <p className="font-pixel text-sm">{won ? t('puz.gotIt', { n: item.wrong.length + 1 }) : t('id.outOfTries')}</p>
          <dl className="flex gap-5 text-sm">
            {[
              [t('puz.played'), stats.played],
              [t('puz.winPct'), stats.played ? Math.round((stats.wins / stats.played) * 100) : 0],
              [t('puz.streak'), stats.streak],
              [t('puz.best'), stats.maxStreak],
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
                `Pokewwwww ${t(`mode.${kind}.title`)} ${daily.key} · ${won ? item.wrong.length + 1 : 'X'}/${MAX_ATTEMPTS}\n${attemptEmoji(
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
              {t('id.tryRun')}
            </button>
          </div>
          <p className="text-xs text-slate-500">{t('id.tomorrow')}</p>
        </section>
      )}
    </div>
  );
}

/** Small hints that appear after wrong daily guesses. */
function DailyHints({ wrong, target }: { wrong: number; target: Pokemon }) {
  const { t } = useT();
  if (!wrong) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-300">
      <span className="font-semibold">{t('hm.hint')}</span>
      <span>
        {t('filter.gen', { n: target.generation })} · {target.region}
      </span>
      {wrong >= 2 && target.types.map((ty) => <TypeBadge key={ty} type={ty} />)}
    </div>
  );
}

/* ----------------------------------- Run ---------------------------------- */

function RunView({ kind }: { kind: IdentifyKind }) {
  const { t } = useT();
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
    const timer = setTimeout(nextRun, REVEAL_MS[current.result]);
    return () => clearTimeout(timer);
  }, [run.revealing, current.result, current.id, nextRun]);

  useEffect(() => setMessage(null), [current.id]);

  const onGuess = (id: number) => {
    const outcome = guessRun(id);
    const left = MAX_ATTEMPTS - (current.wrong.length + 1);
    if (outcome === 'wrong') setMessage(t('id.notIt', { name: byId.get(id)!.name, count: left }));
    else setMessage(null);
  };

  const onExpire = useCallback(() => endRun(), [endRun]);
  const gens = run.generations.length ? t('status.gen', { n: run.generations.join(', ') }) : t('id.allRegions');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div>
          <h1 className="font-pixel text-lg">{t(`mode.${kind}.title`)}</h1>
          <p className="mt-1 text-xs text-slate-500">
            {t('id.timedRun')} · {gens} · {t('status.min', { n: run.minutes })}
          </p>
        </div>
        <div className="text-2xl font-bold tabular-nums" aria-live="polite">
          {summary.correct}
          <span className="ml-1 text-sm font-normal text-slate-500">{t('id.correct')}</span>
        </div>
        <Timer startedAt={run.startedAt} endsAt={run.endsAt} onExpire={onExpire} />
        <div className="ml-auto">
          {confirmEnd ? (
            <span className="flex items-center gap-2 text-sm">
              {t('id.endRunQ')}
              <button type="button" className="rounded bg-red-600 px-3 py-1.5 font-semibold text-white" onClick={endRun}>
                {t('common.yes')}
              </button>
              <button type="button" className={secondary} onClick={() => setConfirmEnd(false)}>
                {t('common.no')}
              </button>
            </span>
          ) : (
            <button type="button" className={secondary} onClick={() => setConfirmEnd(true)}>
              {t('id.endRun')}
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
              {current.result === 'correct' ? t('id.right') : current.result === 'missed' ? t('id.outOfTries') + '.' : t('id.skipped')}
            </p>
            <button ref={nextRef} type="button" className={primary} onClick={nextRun}>
              {t('id.next')}
            </button>
          </>
        ) : (
          <>
            <Tries used={current.wrong.length} />
            <div className="flex w-full items-start gap-2">
              <PokemonInput key={current.id} onSelect={onGuess} exclude={exclude} showSprites={kind !== 'silhouette'} />
              <button type="button" className={`${secondary} shrink-0 py-2.5`} onClick={skipRun}>
                {t('id.skip')}
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
  const { t } = useT();
  const useStore = identifyStores[kind];
  const run = useStore((s) => s.run)!;
  const best = useStore((s) => s.best[runKey(run.generations, run.minutes)]);
  const { startRun, toSetup, setSettings } = useStore.getState();
  const summary = summarize(run.items);
  const gens = run.generations.length ? t('status.gen', { n: run.generations.join(', ') }) : t('id.allRegions');
  const notGot = run.items.filter((i) => i.result !== 'correct');

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white p-6 shadow dark:bg-slate-800/60">
        <h1 className="font-pixel text-xl">{t('id.timeUp')}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {t(`mode.${kind}.title`)} · {gens} · {t('status.min', { n: run.minutes })}
        </p>
        {run.newBest && (
          <p className="mt-2 inline-block rounded bg-amber-100 px-2 py-0.5 text-sm font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
            {t('id.newBest')}
          </p>
        )}
        <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(
            [
              [t('id.correct'), summary.correct],
              [t('id.firstTry'), summary.firstTry],
              [t('id.missed'), summary.missed],
              [t('id.skipped'), summary.skipped],
            ] as const
          ).map(([label, v]) => (
            <div key={label} className="rounded-lg bg-slate-100 p-3 dark:bg-slate-900/60">
              <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
              <dd className="mt-1 text-xl font-bold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        {best && !run.newBest && <p className="mt-4 text-sm text-slate-500">{t('id.bestSetup', { n: best.correct })}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            className={primary}
            onClick={() => {
              setSettings({ generations: run.generations, minutes: run.minutes });
              startRun();
            }}
          >
            {t('id.playAgain')}
          </button>
          <button type="button" className={secondary} onClick={toSetup}>
            {t('id.changeSettings')}
          </button>
          <ShareButton
            text={() =>
              `Pokewwwww ${t(`mode.${kind}.title`)} · ${gens} · ${t('status.min', { n: run.minutes })}\n✅ ${t('id.shareCorrect', { n: summary.correct })}${
                summary.missed + summary.skipped ? ` · ${t('id.shareMissed', { n: summary.missed + summary.skipped })}` : ''
              }`
            }
          />
        </div>
      </section>

      {notGot.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{t('id.theMissed')}</h2>
          <ResultGrid items={notGot} />
        </section>
      )}
      {summary.correct > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{t('id.theGot')}</h2>
          <ResultGrid items={run.items.filter((i) => i.result === 'correct')} />
        </section>
      )}
    </div>
  );
}

/* --------------------------------- Shared --------------------------------- */

function Header({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  const { t } = useT();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="font-pixel text-lg">{title}</h1>
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      </div>
      <button type="button" className={secondary} onClick={onBack}>
        {t('cw.options')}
      </button>
    </div>
  );
}

function Tries({ used }: { used: number }) {
  const { t } = useT();
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500" aria-label={t('id.triesLeft', { count: MAX_ATTEMPTS - used })}>
      {Array.from({ length: MAX_ATTEMPTS }, (_, i) => (
        <span
          key={i}
          className={`h-3 w-3 rounded-full ${i < used ? 'bg-rose-400' : 'bg-emerald-400'}`}
          aria-hidden
        />
      ))}
      <span>
        {t('id.triesLeft', { count: MAX_ATTEMPTS - used })}
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
  const { t } = useT();
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
            {i.result === 'correct' ? (i.wrong.length ? t('id.nTries', { n: i.wrong.length + 1 }) : t('id.firstTryLc')) : t(`id.${i.result as 'missed' | 'skipped'}`).toLowerCase()}
          </span>
        </div>
      ))}
    </div>
  );
}
