import { useCallback, useEffect, useMemo } from 'react';
import { useT } from '../../i18n';
import Keyboard from '../../components/Keyboard';
import TypeBadge from '../../components/TypeBadge';
import { byId } from '../../data';
import { evaluate, maskName, MAX_MISSES } from '../../lib/hangman';
import type { LetterState } from '../../lib/wordle';
import { useHangmanStore } from '../puzzle/stores';
import { GiveUp, PuzzleHeader, PuzzleResult, UnlimitedOptions } from '../puzzle/Chrome';

/** Misses after which each hint appears. */
const HINT_GENUS = 3;
const HINT_TYPES = 5;

export default function HangmanGame() {
  const { t } = useT();
  const mode = useHangmanStore((s) => s.mode);
  const round = useHangmanStore((s) => (s.mode === 'daily' ? s.daily : s.unlimited));
  const generations = useHangmanStore((s) => s.generations);
  const stats = useHangmanStore((s) => s.stats[s.mode]);
  const { setMode, ensureRound, newUnlimited, guess, giveUp, setGenerations } = useHangmanStore.getState();

  useEffect(() => ensureRound(), [mode, ensureRound]);

  const target = round ? byId.get(round.targetId)! : null;
  const state = useMemo(() => (target && round ? evaluate(target.name, round.guesses) : null), [target, round]);
  const keys = useMemo(() => {
    const k: Record<string, LetterState> = {};
    state?.hits.forEach((l) => (k[l] = 'correct'));
    state?.misses.forEach((l) => (k[l] = 'absent'));
    return k;
  }, [state]);
  const onKey = useCallback((l: string) => guess(l), [guess]);

  if (!round || !target || !state) return null;
  const over = round.status !== 'playing';
  const won = round.status === 'won';
  const slots = maskName(target.name, round.guesses);
  const misses = state.misses.length;

  return (
    <div className="space-y-5">
      <PuzzleHeader
        title={t('mode.hangman.title')}
        intro={t('hm.intro', { max: MAX_MISSES })}
        mode={mode}
        onMode={(m) => setMode(m)}
      />
      {mode === 'unlimited' && (
        <UnlimitedOptions generations={generations} onGenerations={setGenerations} onNew={() => newUnlimited()} />
      )}

      <section className="mx-auto flex max-w-2xl flex-col items-center gap-5 rounded-2xl bg-white p-5 shadow-lg dark:bg-slate-800 sm:p-8">
        <Gallows misses={misses} lost={round.status === 'lost'} label={t('hm.gallows', { n: misses, max: MAX_MISSES })} />

        <div className="flex flex-wrap justify-center gap-1.5" aria-label={t('hm.nameSoFar')} role="group">
          {slots.map((s, i) =>
            s.ch === ' ' ? (
              <span key={i} className="w-4" aria-hidden />
            ) : (
              <span
                key={i}
                className={`flex h-11 w-8 items-end justify-center border-b-4 pb-0.5 text-2xl font-bold uppercase sm:w-9 ${
                  s.hidden
                    ? over
                      ? 'border-rose-400 text-rose-500'
                      : 'border-slate-400 text-transparent dark:border-slate-500'
                    : 'border-emerald-500'
                }`}
                aria-label={s.hidden && !over ? t('hm.hidden') : s.ch}
              >
                {s.hidden ? (over ? s.ch : '_') : s.ch}
              </span>
            ),
          )}
        </div>

        <div className="flex min-h-[2rem] flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
          <span className="tabular-nums text-slate-600 dark:text-slate-300">
            {t('hm.misses')} <strong className={misses ? 'text-rose-600 dark:text-rose-400' : ''}>{misses}</strong> / {MAX_MISSES}
          </span>
          {state.misses.length > 0 && (
            <span className="font-mono tracking-widest text-rose-500 line-through">{state.misses.join(' ')}</span>
          )}
        </div>

        {!over && (misses >= HINT_GENUS || misses >= HINT_TYPES) && (
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-semibold">{t('hm.hint')}</span>
            {misses >= HINT_GENUS && <span>{target.genus}</span>}
            {misses >= HINT_TYPES && (
              <>
                <span>· {t('filter.gen', { n: target.generation })}</span>
                {target.types.map((t) => (
                  <TypeBadge key={t} type={t} />
                ))}
              </>
            )}
          </div>
        )}
      </section>

      {!over && (
        <div className="mx-auto max-w-2xl space-y-3">
          <Keyboard states={keys} onKey={onKey} />
          <div className="flex justify-center">{round.guesses.length > 0 && <GiveUp onConfirm={giveUp} />}</div>
        </div>
      )}

      {over && (
        <div className="mx-auto max-w-3xl">
          <PuzzleResult
            targetId={round.targetId}
            won={won}
            headline={won ? (misses ? t('hm.solved', { count: misses }) : t('hm.flawless')) : t('puz.itWas')}
            stats={stats}
            daily={round.mode === 'daily'}
            onNext={() => newUnlimited()}
            shareText={() =>
              `Pokewwwww ${t('mode.hangman.title')} ${round.mode === 'daily' ? round.key : t('common.unlimitedKey')} · ${
                won ? t('hm.shareMisses', { n: misses, max: MAX_MISSES }) : 'X'
              }\n${round.guesses.map((l) => (state.misses.includes(l) ? '🟥' : '🟩')).join('')}`
            }
          />
        </div>
      )}
    </div>
  );
}

/** Classic gallows; one body part per miss (head, body, arms, legs). */
function Gallows({ misses, lost, label }: { misses: number; lost: boolean; label: string }) {
  const part = (n: number) =>
    `transition-opacity duration-300 ${misses >= n ? 'opacity-100' : 'opacity-0'} ${lost ? 'stroke-rose-500' : 'stroke-current'}`;
  return (
    <svg viewBox="0 0 120 130" className="h-40 w-36 text-slate-700 dark:text-slate-200" aria-label={label} role="img">
      <g fill="none" strokeWidth="4" strokeLinecap="round" className="stroke-slate-400 dark:stroke-slate-500">
        <path d="M10 125 H70 M30 125 V8 H85 V22" />
      </g>
      <g fill="none" strokeWidth="4" strokeLinecap="round">
        <circle cx="85" cy="34" r="12" className={part(1)} />
        <path d="M85 46 V82" className={part(2)} />
        <path d="M85 56 L70 70" className={part(3)} />
        <path d="M85 56 L100 70" className={part(4)} />
        <path d="M85 82 L72 102" className={part(5)} />
        <path d="M85 82 L98 102" className={part(6)} />
      </g>
    </svg>
  );
}
