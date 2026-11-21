import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { MODES } from '../games/modes';
import { POKEDEX } from '../data';
import Sprite from '../components/Sprite';
import { todayKey } from '../lib/rng';
import { formatClock } from '../lib/timed';
import { availableLengths } from '../lib/wordle';
import { useTimedStore } from '../games/timed/store';
import { useGuessStore } from '../games/guess/store';
import { useWordleStore } from '../games/wordle/store';
import { useCrossStore } from '../games/crossword/store';
import { identifyStores } from '../games/identify/store';
import type { IdentifyKind } from '../games/identify/kinds';

const DAILY_LENGTHS = availableLengths(POKEDEX).map((l) => l.length);

export default function Home() {
  return (
    <>
      <section className="py-6 text-center">
        <h1 className="font-pixel text-2xl leading-relaxed sm:text-3xl">Pokémon Trivia</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          {MODES.length} ways to test what you know about all {POKEDEX.length} Pokémon.
        </p>
      </section>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODES.map((m) => (
          <Link
            key={m.path}
            to={m.path}
            className="flex flex-col rounded-xl bg-white p-5 shadow transition hover:-translate-y-0.5 hover:shadow-lg dark:bg-slate-800"
          >
            <div className="mb-3 flex flex-wrap gap-1">
              {m.sprites.map((id) => (
                <Sprite key={id} id={id} scale={1.25} />
              ))}
            </div>
            <h2 className="font-pixel text-sm">{m.title}</h2>
            <p className="mt-2 flex-1 text-sm text-slate-600 dark:text-slate-300">{m.blurb}</p>
            <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
              {STATUS[m.path]?.()}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

const Done = ({ children }: { children: ReactNode }) => (
  <span className="font-semibold text-emerald-600 dark:text-emerald-400">✓ {children}</span>
);
const Pending = ({ children }: { children: ReactNode }) => (
  <span className="font-semibold text-amber-600 dark:text-amber-400">{children}</span>
);

function TimedStatus() {
  const best = useTimedStore((s) => s.best);
  const top = Object.entries(best).sort(([, a], [, b]) => b.found / b.total - a.found / a.total)[0];
  if (!top) return <>No games yet. How many can you name?</>;
  const [key, rec] = top;
  const [gens, dur, easy] = key.split('|');
  return (
    <>
      Best: <strong>{rec.found}/{rec.total}</strong> · {gens === 'all' ? 'all gens' : `Gen ${gens}`} ·{' '}
      {dur === 'untimed' ? 'no limit' : `${dur} min`}
      {easy ? ' · easy' : ''}
    </>
  );
}

function GuessStatus() {
  const daily = useGuessStore((s) => s.daily);
  const stats = useGuessStore((s) => s.stats.daily);
  const today = daily?.key === todayKey() ? daily : null;
  const streak = stats.streak ? ` · ${stats.streak}-day streak` : '';
  if (!today || (today.status === 'playing' && !today.guesses.length)) return <>Today&apos;s daily is waiting{streak}</>;
  if (today.status === 'playing') {
    const n = today.guesses.length;
    return <Pending>Daily in progress · {n} {n === 1 ? 'guess' : 'guesses'} so far</Pending>;
  }
  return (
    <>
      <Done>{today.status === 'won' ? `Daily solved in ${today.guesses.length}` : 'Daily done'}</Done>
      {streak}
    </>
  );
}

function WordleStatus() {
  const rounds = useWordleStore((s) => s.rounds);
  const today = todayKey();
  const done = DAILY_LENGTHS.filter((l) => {
    const r = rounds[`daily:${l}`];
    return r?.key === today && r.status !== 'playing';
  }).length;
  if (!done) return <>{DAILY_LENGTHS.length} dailies today, one per length</>;
  if (done === DAILY_LENGTHS.length) return <Done>All {done} dailies done today</Done>;
  return <Pending>{done} of {DAILY_LENGTHS.length} dailies done today</Pending>;
}

function CrossStatus() {
  const daily = useCrossStore((s) => s.daily);
  if (daily?.key !== todayKey()) return <>Today&apos;s daily puzzle is ready</>;
  if (daily.solvedAt) return <Done>Daily solved in {formatClock(daily.solvedAt - daily.startedAt)}</Done>;
  const filled = daily.entries.filter(Boolean).length;
  return filled ? <Pending>Daily in progress</Pending> : <>Today&apos;s daily puzzle is ready</>;
}

const STATUS: Record<string, () => ReactNode> = {
  '/timed': () => <TimedStatus />,
  '/guess': () => <GuessStatus />,
  '/wordle': () => <WordleStatus />,
  '/crossword': () => <CrossStatus />,
  '/silhouette': () => <IdentifyStatus kind="silhouette" />,
  '/cry': () => <IdentifyStatus kind="cry" />,
};

function IdentifyStatus({ kind }: { kind: IdentifyKind }) {
  const useStore = identifyStores[kind];
  const daily = useStore((s) => s.daily);
  const streak = useStore((s) => s.dailyStats.streak);
  const bestRun = useStore((s) => Math.max(0, ...Object.values(s.best).map((b) => b.correct)));
  const today = daily?.key === todayKey() ? daily.item : null;
  const extra = `${streak ? ` · ${streak}-day streak` : ''}${bestRun ? ` · best run ${bestRun}` : ''}`;
  if (!today || (!today.result && !today.wrong.length)) return <>Pokémon of the day is waiting{extra}</>;
  if (!today.result) return <Pending>Daily in progress · {3 - today.wrong.length} tries left</Pending>;
  return (
    <>
      <Done>{today.result === 'correct' ? `Daily solved in ${today.wrong.length + 1}` : 'Daily done'}</Done>
      {extra}
    </>
  );
}
