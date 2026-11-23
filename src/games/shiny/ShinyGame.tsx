import { memo, useEffect, useMemo, useRef } from 'react';
import Sprite from '../../components/Sprite';
import { byId, getPool, POKEDEX } from '../../data';
import { useT } from '../../i18n';
import { BOARD_SIZE, MAX_MISSES, buildBoard, evaluate, isShinyCandidate, pickRow, roundSeed } from '../../lib/shiny';
import { useShinyStore } from '../puzzle/stores';
import { GiveUp, PuzzleHeader, PuzzleResult, UnlimitedOptions } from '../puzzle/Chrome';

type CellState = 'idle' | 'wrong' | 'found' | 'revealed';

const CELL: Record<CellState, string> = {
  idle: 'border-slate-200 bg-white hover:border-red-400 hover:bg-red-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700',
  wrong: 'border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40',
  found: 'animate-pop border-amber-400 bg-amber-50 ring-4 ring-amber-400 dark:bg-amber-900/30',
  revealed: 'animate-pop border-amber-400 bg-amber-50 ring-4 ring-amber-300 dark:bg-amber-900/30',
};

export default function ShinyGame() {
  const { t } = useT();
  const mode = useShinyStore((s) => s.mode);
  const round = useShinyStore((s) => (s.mode === 'daily' ? s.daily : s.unlimited));
  const generations = useShinyStore((s) => s.generations);
  const stats = useShinyStore((s) => s.stats[s.mode]);
  const { setMode, ensureRound, newUnlimited, guess, giveUp, setGenerations } = useShinyStore.getState();

  useEffect(() => ensureRound(isShinyCandidate), [mode, ensureRound]);

  const board = useMemo(() => {
    if (!round) return [];
    const pool = round.mode === 'daily' ? POKEDEX : getPool({ generations: round.generations });
    return buildBoard(round.targetId, roundSeed(round), pool);
  }, [round?.mode, round?.key, round?.targetId]); // eslint-disable-line react-hooks/exhaustive-deps
  const picked = useMemo(() => new Set(round?.guesses), [round?.guesses]);
  const targetRef = useRef<HTMLButtonElement>(null);

  const over = round ? round.status !== 'playing' : false;
  // Once the round ends, bring the shiny into view so a loss still shows where it was.
  useEffect(() => {
    if (over) targetRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [over, round?.key]);

  if (!round) return null;
  const { misses } = evaluate(round.guesses, round.targetId);
  const won = round.status === 'won';
  const last = round.guesses.length ? byId.get(round.guesses[round.guesses.length - 1])! : null;

  return (
    <div className="space-y-5">
      <PuzzleHeader
        title={t('mode.shiny.title')}
        intro={t('sh.intro', { total: BOARD_SIZE, max: MAX_MISSES })}
        mode={mode}
        onMode={(m) => setMode(m, isShinyCandidate)}
      />
      {mode === 'unlimited' && (
        <UnlimitedOptions
          generations={generations}
          onGenerations={setGenerations}
          onNew={() => newUnlimited(isShinyCandidate)}
          eligible={isShinyCandidate}
        />
      )}

      <div className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-slate-200 bg-slate-100/95 px-4 py-2.5 text-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        <span className="tabular-nums" aria-live="polite">
          {t('hm.misses')} <strong className={misses ? 'text-rose-600 dark:text-rose-400' : ''}>{misses}</strong> / {MAX_MISSES}
        </span>
        <span className="text-slate-500">{t('sh.sprites', { n: board.length })}</span>
        <span className="min-h-[1.25rem] text-slate-600 dark:text-slate-300" aria-live="polite">
          {!over && last && `✗ ${t('sh.notShiny', { name: last.name })}`}
        </span>
        {!over && round.guesses.length > 0 && (
          <div className="ml-auto">
            <GiveUp onConfirm={giveUp} />
          </div>
        )}
      </div>

      <div
        role="group"
        aria-label={t('sh.board')}
        className="grid grid-cols-[repeat(auto-fill,minmax(60px,1fr))] gap-1.5"
      >
        {board.map((id, i) => {
          const isTarget = id === round.targetId;
          const state: CellState = isTarget && over ? (won ? 'found' : 'revealed') : picked.has(id) ? 'wrong' : 'idle';
          return (
            <Cell
              key={id}
              id={id}
              index={i}
              state={state}
              // The shiny is the only sprite loaded from the shiny folder, and nothing else tells them apart.
              shiny={isTarget}
              disabled={over || picked.has(id)}
              onPick={guess}
              refCb={isTarget ? targetRef : undefined}
            />
          );
        })}
      </div>

      {over && (
        <div className="mx-auto max-w-3xl">
          <PuzzleResult
            targetId={round.targetId}
            shiny
            won={won}
            headline={won ? (misses ? t('sh.found', { count: misses }) : t('sh.firstTry')) : t('sh.itWas')}
            stats={stats}
            daily={round.mode === 'daily'}
            onNext={() => newUnlimited(isShinyCandidate)}
            shareText={() =>
              `Pokewwwww ${t('mode.shiny.title')} ${round.mode === 'daily' ? round.key : t('common.unlimitedKey')} · ${
                won ? t('hm.shareMisses', { n: misses, max: MAX_MISSES }) : 'X'
              }\n${pickRow(misses, won)}`
            }
          />
        </div>
      )}
    </div>
  );
}

const Cell = memo(function Cell({
  id,
  index,
  state,
  shiny,
  disabled,
  onPick,
  refCb,
}: {
  id: number;
  index: number;
  state: CellState;
  shiny: boolean;
  disabled: boolean;
  onPick: (id: number) => void;
  refCb?: React.RefObject<HTMLButtonElement>;
}) {
  const { t } = useT();
  const p = byId.get(id)!;
  // The name is only exposed once the sprite has been picked or the round is over.
  const known = state !== 'idle';
  return (
    <button
      ref={refCb}
      type="button"
      disabled={disabled}
      onClick={() => onPick(id)}
      aria-label={known ? `${p.name}${state === 'wrong' ? ` ✗` : ' ✨'}` : t('sh.cell', { n: index + 1 })}
      title={known ? p.name : undefined}
      className={`relative flex h-[64px] items-center justify-center rounded-md border transition disabled:cursor-default ${CELL[state]}`}
    >
      <Sprite id={id} scale={1} shiny={shiny} className={state === 'wrong' ? 'opacity-40 grayscale' : ''} />
      {state === 'wrong' && (
        <span aria-hidden className="absolute inset-0 flex items-center justify-center text-xl font-bold text-rose-600">
          ✗
        </span>
      )}
      {(state === 'found' || state === 'revealed') && (
        <span aria-hidden className="absolute -right-1 -top-1 text-base">
          ✨
        </span>
      )}
    </button>
  );
});
