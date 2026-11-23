import { useT } from '../../i18n';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { byId } from '../../data';
import Keyboard from '../../components/Keyboard';
import ShareButton from '../../components/ShareButton';
import Sprite from '../../components/Sprite';
import TypeBadge from '../../components/TypeBadge';
import { keyboardState, rowsFor, shareGrid } from '../../lib/wordle';
import { todayKey } from '../../lib/rng';
import { roundKey, useCurrentRound, useWordleStore, type WordleRound } from './store';
import Setup from './Setup';
import Board from './Board';

export default function WordleGame() {
  const screen = useWordleStore((s) => s.screen);
  const round = useCurrentRound();
  const stale = round?.mode === 'daily' && round.key !== todayKey();
  if (screen === 'setup' || !round || stale) return <Setup />;
  return <Game key={`${round.mode}:${round.key}:${round.length}`} round={round} />;
}

function Game({ round }: { round: WordleRound }) {
  const { t } = useT();
  const { submit, revealHint, toSetup, newUnlimited } = useWordleStore.getState();
  const [current, setCurrent] = useState('');
  const [shake, setShake] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const playing = round.status === 'playing';
  const target = byId.get(round.targetId)!;

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 1600);
    return () => clearTimeout(timer);
  }, [message]);

  const onKey = useCallback(
    (k: string) => setCurrent((c) => (c.length < round.length ? c + k : c)),
    [round.length],
  );
  const onBackspace = useCallback(() => setCurrent((c) => c.slice(0, -1)), []);
  const onEnter = useCallback(() => {
    const r = submit(current);
    if (r === 'ok') setCurrent('');
    else {
      setShake(true);
      setMessage(t(r === 'short' ? 'wd.short' : 'wd.invalid'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, submit]);

  const keys = useMemo(() => keyboardState(round.guesses, round.answer), [round.guesses, round.answer]);
  const rowsLeft = round.maxRows - round.guesses.length;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-pixel text-xl">{t('mode.wordle.title')}</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {round.mode === 'daily' ? t('cw.dailyKey', { key: round.key }) : t('mode.unlimited')} · {t('wd.lettersN', { n: round.length })}
            {round.strict ? ` · ${t('wd.strictLc')}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={toSetup}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:border-slate-400 dark:border-slate-600"
          >
            {t('wd.changeLength')}
          </button>
          {round.mode === 'unlimited' && (
            <button
              type="button"
              onClick={newUnlimited}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:border-slate-400 dark:border-slate-600"
            >
              {t('wd.newWord')}
            </button>
          )}
        </div>
      </header>

      <div className="relative">
        {message && (
          <div
            role="alert"
            className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-full rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white shadow dark:bg-white dark:text-slate-900"
          >
            {message}
          </div>
        )}
        <Board
          length={round.length}
          rows={round.maxRows}
          guesses={round.guesses}
          answer={round.answer}
          current={current}
          shake={shake}
          onShakeEnd={() => setShake(false)}
        />
      </div>

      {playing && (
        <div className="flex min-h-[2.5rem] flex-wrap items-center justify-center gap-3 text-sm">
          {round.hintUsed ? (
            <span className="flex items-center gap-2">
              {t('hm.hint')} {target.types.map((ty) => <TypeBadge key={ty} type={ty} />)}
            </span>
          ) : (
            <button
              type="button"
              disabled={rowsLeft <= 1}
              onClick={revealHint}
              className="rounded border border-red-500 px-3 py-1 font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              {t('wd.showTypes')}
            </button>
          )}
          <span className="text-slate-500">
            {t('wd.left', { count: rowsLeft })}
          </span>
        </div>
      )}

      {!playing && <Result round={round} />}

      <Keyboard states={keys} onKey={onKey} onEnter={onEnter} onBackspace={onBackspace} disabled={!playing} />
    </div>
  );
}

function Result({ round }: { round: WordleRound }) {
  const { t } = useT();
  const stats = useWordleStore((s) => s.stats[roundKey(round.mode, round.length)]);
  const { newUnlimited, toSetup } = useWordleStore.getState();
  const target = byId.get(round.targetId)!;
  const won = round.status === 'won';
  const n = round.guesses.length;
  const maxBase = rowsFor(round.length);

  const text = () => {
    const head = `Pokewwwww ${t('mode.wordle.title')} ${t('wd.lettersN', { n: round.length })} ${round.mode === 'daily' ? round.key : t('common.unlimitedKey')} · ${
      won ? `${n}/${round.maxRows}` : `X/${round.maxRows}`
    }${round.hintUsed ? ` · ${t('wd.hintLc')}` : ''}`;
    return `${head}\n${shareGrid(round.guesses, round.answer)}`;
  };

  const dist = stats?.distribution ?? {};
  const maxCount = Math.max(1, ...Object.values(dist));

  return (
    <section className="flex flex-col gap-5 rounded-xl bg-white p-5 shadow dark:bg-slate-800/60 sm:flex-row">
      <div className="flex flex-col items-center sm:w-48">
        <Sprite id={target.id} scale={2.5} className="animate-pop" />
        <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
          {won ? t('puz.gotIt', { n }) : t('puz.itWas')}
        </p>
        <h2 className="text-xl font-bold">{target.name}</h2>
        <div className="mt-1 flex gap-1">
          {target.types.map((ty) => (
            <TypeBadge key={ty} type={ty} />
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-3">
        {stats && (
          <dl className="flex gap-5 text-center text-sm">
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
        )}
        <div className="space-y-1" aria-label={t('wd.distribution', { n: round.length })}>
          {Array.from({ length: maxBase }, (_, i) => i + 1).map((k) => {
            const c = dist[k] ?? 0;
            const mine = won && k === n;
            return (
              <div key={k} className="flex items-center gap-2 text-xs">
                <span className="w-3 tabular-nums">{k}</span>
                <div
                  className={`rounded px-1.5 py-0.5 text-right font-semibold text-white ${mine ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-600'}`}
                  style={{ width: `${Math.max(8, (c / maxCount) * 100)}%` }}
                >
                  {c}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:w-40">
        <ShareButton text={text} />
        <button
          type="button"
          onClick={newUnlimited}
          className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white shadow hover:bg-red-700"
        >
          {round.mode === 'daily' ? t('puz.playUnlimited') : t('wd.newWord')}
        </button>
        <button type="button" onClick={toSetup} className="text-sm text-slate-500 underline">
          {t('wd.tryLength')}
        </button>
      </div>
    </section>
  );
}
