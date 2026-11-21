import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { byId } from '../../data';
import Sprite from '../../components/Sprite';
import Timer from '../../components/Timer';
import { findNearMiss, resolveGuess } from '../../lib/timed';
import { useTimedStore } from './store';
import DexGrid from './DexGrid';

/** How long an ambiguous match (Mew vs Mewtwo) waits before counting. */
const AMBIGUOUS_DELAY = 800;
/** Pause after typing before a spelling hint appears, so it doesn't flash mid-word. */
const TYPO_DELAY = 600;

type Feedback =
  | { kind: 'found'; id: number; at: number; typo?: boolean }
  | { kind: 'already'; id: number; at: number }
  | { kind: 'outOfScope'; id: number; at: number }
  | { kind: 'close'; id: number; found: boolean; at: number };

export default function Play() {
  const game = useTimedStore((s) => s.game);
  const find = useTimedStore((s) => s.find);
  const finish = useTimedStore((s) => s.finish);

  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [confirmGiveUp, setConfirmGiveUp] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pending = useRef<ReturnType<typeof setTimeout>>();
  const typoTimer = useRef<ReturnType<typeof setTimeout>>();

  const scope = useMemo(() => new Set(game.scopeIds), [game.scopeIds]);
  const found = useMemo(() => new Set(game.found), [game.found]);
  const lastId = game.found.length ? game.found[game.found.length - 1] : null;
  const easy = !!game.settings.easy;

  const accept = useCallback(
    (id: number, typo = false) => {
      clearTimeout(pending.current);
      find(id);
      setInput('');
      setFeedback({ kind: 'found', id, at: Date.now(), typo });
    },
    [find],
  );

  const showNearMiss = (value: string) => {
    const m = findNearMiss(value, scope, found);
    if (!m) return;
    // Easy mode: a one-mistake spelling of a Pokémon you haven't found counts.
    if (easy && !m.found) accept(m.id, true);
    else setFeedback({ kind: 'close', id: m.id, found: m.found, at: Date.now() });
  };

  const onChange = (value: string) => {
    setInput(value);
    clearTimeout(pending.current);
    clearTimeout(typoTimer.current);
    // A spelling hint is about the old text; drop it and re-check after a pause.
    setFeedback((f) => (f?.kind === 'close' ? null : f));
    const r = resolveGuess(value, scope, found);
    if (r.kind === 'match') accept(r.id);
    else if (r.kind === 'ambiguous') pending.current = setTimeout(() => accept(r.id), AMBIGUOUS_DELAY);
    else if (r.kind === 'already' || r.kind === 'outOfScope') {
      setFeedback({ kind: r.kind, id: r.id, at: Date.now() });
      if (r.kind === 'already') setShake(true);
    } else typoTimer.current = setTimeout(() => showNearMiss(value), TYPO_DELAY);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const r = resolveGuess(input, scope, found);
      if (r.kind === 'match' || r.kind === 'ambiguous') accept(r.id);
      else if (r.kind === 'none') {
        clearTimeout(typoTimer.current);
        showNearMiss(input);
      }
    } else if (e.key === 'Escape') {
      clearTimeout(pending.current);
      clearTimeout(typoTimer.current);
      setInput('');
      setFeedback((f) => (f?.kind === 'close' ? null : f));
    }
  };

  useEffect(
    () => () => {
      clearTimeout(pending.current);
      clearTimeout(typoTimer.current);
    },
    [],
  );
  useEffect(() => inputRef.current?.focus(), []);
  const onExpire = useCallback(() => finish('time'), [finish]);

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-10 -mx-4 border-b border-slate-200 bg-slate-100/95 px-4 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="text-2xl font-bold tabular-nums" aria-live="polite">
            {game.found.length}
            <span className="text-base font-normal text-slate-500"> / {game.scopeIds.length}</span>
          </div>
          <Timer startedAt={game.startedAt} endsAt={game.endsAt} onExpire={onExpire} />
          {easy && (
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
              Easy mode
            </span>
          )}
          <div className="ml-auto">
            {confirmGiveUp ? (
              <span className="flex items-center gap-2 text-sm">
                Give up?
                <button
                  type="button"
                  className="rounded bg-red-600 px-3 py-1.5 font-semibold text-white hover:bg-red-700"
                  onClick={() => finish('gaveUp')}
                >
                  Yes
                </button>
                <button
                  type="button"
                  className="rounded border border-slate-300 px-3 py-1.5 dark:border-slate-600"
                  onClick={() => {
                    setConfirmGiveUp(false);
                    inputRef.current?.focus();
                  }}
                >
                  Keep going
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:border-red-500 hover:text-red-600 dark:border-slate-600"
                onClick={() => setConfirmGiveUp(true)}
              >
                Give up
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            value={input}
            onAnimationEnd={() => setShake(false)}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="Type a Pokémon name…"
            aria-label="Pokémon name"
            aria-describedby="timed-feedback"
            className={`w-full max-w-sm rounded-lg border bg-white px-4 py-2.5 text-lg outline-none focus:ring-2 dark:bg-slate-800 ${
              feedback?.kind === 'close'
                ? 'border-amber-400 focus:border-amber-400 focus:ring-amber-400/40'
                : 'border-slate-300 focus:border-red-500 focus:ring-red-500/30 dark:border-slate-600'
            } ${shake ? 'animate-shake' : ''}`}
          />
          <div id="timed-feedback" aria-live="polite">
            <FeedbackLine feedback={feedback} />
          </div>
        </div>
      </div>

      <DexGrid scopeIds={game.scopeIds} found={found} ended={false} silhouettes={game.settings.silhouettes} lastId={lastId} />
    </div>
  );
}

function FeedbackLine({ feedback }: { feedback: Feedback | null }) {
  if (!feedback) return <span className="text-sm text-slate-500">Esc clears · Enter confirms</span>;
  const p = byId.get(feedback.id)!;
  if (feedback.kind === 'found')
    return (
      <span key={feedback.at} className="flex animate-pop items-center gap-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
        <Sprite id={p.id} scale={0.6} /> {p.name}!
        {feedback.typo && <span className="font-normal text-slate-500 dark:text-slate-400">(spelling fixed)</span>}
      </span>
    );
  if (feedback.kind === 'close')
    return (
      <span
        key={feedback.at}
        role="status"
        className="inline-flex animate-pop items-center gap-1.5 rounded-md border border-amber-300 bg-amber-100 px-2.5 py-1 text-sm font-medium text-amber-900 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
      >
        <span aria-hidden>⚠️</span>
        {feedback.found
          ? `Close to ${p.name}, which you already found`
          : 'So close! One letter off. Check the spelling'}
      </span>
    );
  if (feedback.kind === 'already')
    return <span className="text-sm text-amber-700 dark:text-amber-400">Already found {p.name}</span>;
  return <span className="text-sm text-slate-500">{p.name} isn&apos;t in this quiz</span>;
}
