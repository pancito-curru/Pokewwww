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
import { useGpsStore, useHangmanStore, useMovesetStore, useShinyStore } from '../games/puzzle/stores';
import { useExploreStore } from '../games/gps/exploreStore';

import { useT, type TFn } from '../i18n';

const DAILY_LENGTHS = availableLengths(POKEDEX).map((l) => l.length);

export default function Home() {
  const { t } = useT();
  return (
    <>
      <section className="py-6 text-center">
        <h1 className="font-pixel text-2xl leading-relaxed sm:text-3xl">{t('home.title')}</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          {t('home.subtitle', { modes: MODES.length, total: POKEDEX.length })}
        </p>
      </section>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODES.map((m) => (
          <Link
            key={m.path}
            to={m.path}
            className="flex min-h-[17rem] flex-col rounded-xl bg-white p-5 shadow transition hover:-translate-y-0.5 hover:shadow-lg dark:bg-slate-800"
          >
            {/* Sprites centered in the space above the text, which stays at the bottom. */}
            <div className="flex flex-1 items-center justify-center gap-2 py-3">
              {m.sprites.map((id) => (
                <Sprite key={id} id={id} scale={1.25} />
              ))}
            </div>
            <div>
              <h2 className="font-pixel text-sm">{t(`mode.${m.id}.title`)}</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t(`mode.${m.id}.blurb`)}</p>
              <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                {STATUS[m.path]?.()}
              </div>
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

const streakText = (t: TFn, n: number) => (n ? t('status.streak', { n }) : '');

function TimedStatus() {
  const { t } = useT();
  const best = useTimedStore((s) => s.best);
  const top = Object.entries(best).sort(([, a], [, b]) => b.found / b.total - a.found / a.total)[0];
  if (!top) return <>{t('status.timed.none')}</>;
  const [key, rec] = top;
  const [gens, dur, easy] = key.split('|');
  return (
    <>
      {t('status.timed.best', {
        found: rec.found,
        total: rec.total,
        gens: gens === 'all' ? t('status.allGens') : t('status.gen', { n: gens }),
        dur: dur === 'untimed' ? t('status.noLimit') : t('status.min', { n: dur }),
        easy: easy ? t('status.easy') : '',
      })}
    </>
  );
}

function GuessStatus() {
  const { t } = useT();
  const daily = useGuessStore((s) => s.daily);
  const stats = useGuessStore((s) => s.stats.daily);
  const today = daily?.key === todayKey() ? daily : null;
  const streak = streakText(t, stats.streak);
  if (!today || (today.status === 'playing' && !today.guesses.length)) return <>{t('status.dailyWaiting', { extra: streak })}</>;
  if (today.status === 'playing') return <Pending>{t('status.guess.progress', { count: today.guesses.length })}</Pending>;
  return (
    <>
      <Done>{today.status === 'won' ? t('status.dailySolvedIn', { n: today.guesses.length }) : t('status.dailyDone')}</Done>
      {streak}
    </>
  );
}

function WordleStatus() {
  const { t } = useT();
  const rounds = useWordleStore((s) => s.rounds);
  const today = todayKey();
  const done = DAILY_LENGTHS.filter((l) => {
    const r = rounds[`daily:${l}`];
    return r?.key === today && r.status !== 'playing';
  }).length;
  if (!done) return <>{t('status.wordle.none', { n: DAILY_LENGTHS.length })}</>;
  if (done === DAILY_LENGTHS.length) return <Done>{t('status.wordle.all', { n: done })}</Done>;
  return <Pending>{t('status.wordle.some', { done, n: DAILY_LENGTHS.length })}</Pending>;
}

function CrossStatus() {
  const { t } = useT();
  const daily = useCrossStore((s) => s.daily);
  if (daily?.key !== todayKey()) return <>{t('status.cross.ready')}</>;
  if (daily.solvedAt) return <Done>{t('status.cross.solved', { time: formatClock(daily.solvedAt - daily.startedAt) })}</Done>;
  const filled = daily.entries.filter(Boolean).length;
  return filled ? <Pending>{t('status.dailyProgress')}</Pending> : <>{t('status.cross.ready')}</>;
}

const STATUS: Record<string, () => ReactNode> = {
  '/timed': () => <TimedStatus />,
  '/guess': () => <GuessStatus />,
  '/wordle': () => <WordleStatus />,
  '/crossword': () => <CrossStatus />,
  '/silhouette': () => <IdentifyStatus kind="silhouette" />,
  '/cry': () => <IdentifyStatus kind="cry" />,
  '/moveset': () => <MovesetStatus />,
  '/hangman': () => <HangmanStatus />,
  '/shiny': () => <ShinyStatus />,
  '/gps': () => <GpsStatus />,
};

function IdentifyStatus({ kind }: { kind: IdentifyKind }) {
  const { t } = useT();
  const useStore = identifyStores[kind];
  const daily = useStore((s) => s.daily);
  const streak = useStore((s) => s.dailyStats.streak);
  const bestRun = useStore((s) => Math.max(0, ...Object.values(s.best).map((b) => b.correct)));
  const today = daily?.key === todayKey() ? daily.item : null;
  const extra = `${streakText(t, streak)}${bestRun ? t('status.bestRun', { n: bestRun }) : ''}`;
  if (!today || (!today.result && !today.wrong.length)) return <>{t('status.potdWaiting', { extra })}</>;
  if (!today.result) return <Pending>{t('status.triesLeft', { n: 3 - today.wrong.length })}</Pending>;
  return (
    <>
      <Done>{today.result === 'correct' ? t('status.dailySolvedIn', { n: today.wrong.length + 1 }) : t('status.dailyDone')}</Done>
      {extra}
    </>
  );
}

function PuzzleStatusView({
  daily,
  streak,
  unit,
}: {
  daily: { key: string; status: string; guesses: unknown[] } | null;
  streak: number;
  unit: 'guess' | 'miss';
}) {
  const { t } = useT();
  const today = daily?.key === todayKey() ? daily : null;
  const extra = streakText(t, streak);
  if (!today || (today.status === 'playing' && !today.guesses.length)) return <>{t('status.potdWaiting', { extra })}</>;
  if (today.status === 'playing') return <Pending>{t('status.dailyProgress')}</Pending>;
  const n = unit === 'guess' ? today.guesses.length : null;
  return (
    <>
      <Done>{today.status === 'won' ? (n ? t('status.dailySolvedIn', { n }) : t('status.dailySolved')) : t('status.dailyDone')}</Done>
      {extra}
    </>
  );
}

function MovesetStatus() {
  const daily = useMovesetStore((s) => s.daily);
  const streak = useMovesetStore((s) => s.stats.daily.streak);
  return <PuzzleStatusView daily={daily} streak={streak} unit="guess" />;
}

function HangmanStatus() {
  const daily = useHangmanStore((s) => s.daily);
  const streak = useHangmanStore((s) => s.stats.daily.streak);
  return <PuzzleStatusView daily={daily} streak={streak} unit="miss" />;
}

function ShinyStatus() {
  const { t } = useT();
  const daily = useShinyStore((s) => s.daily);
  const streak = useShinyStore((s) => s.stats.daily.streak);
  const today = daily?.key === todayKey() ? daily : null;
  const extra = streakText(t, streak);
  if (!today || (today.status === 'playing' && !today.guesses.length)) return <>{t('status.dailyWaiting', { extra })}</>;
  if (today.status === 'playing') return <Pending>{t('status.dailyProgress')}</Pending>;
  return (
    <>
      <Done>{today.status === 'won' ? t('status.dailySolved') : t('status.dailyDone')}</Done>
      {extra}
    </>
  );
}

function GpsStatus() {
  const { t } = useT();
  const maps = useExploreStore((s) => s.stats.maps);
  const daily = useGpsStore((s) => s.daily);
  const streak = useGpsStore((s) => s.stats.daily.streak);
  const mapsText = maps ? ` · ${t('status.gpsMaps', { count: maps })}` : '';
  const today = daily?.key === todayKey() ? daily : null;
  const extra = `${streakText(t, streak)}${mapsText}`;
  if (!today || (today.status === 'playing' && !today.guesses.length)) return <>{t('status.potdWaiting', { extra })}</>;
  if (today.status === 'playing') return <Pending>{t('status.dailyProgress')}</Pending>;
  return (
    <>
      <Done>{today.status === 'won' ? t('status.dailySolvedIn', { n: today.guesses.length }) : t('status.dailyDone')}</Done>
      {extra}
    </>
  );
}
