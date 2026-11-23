import { memo, useEffect, useMemo, useRef } from 'react';
import Sprite from '../../components/Sprite';
import { byId } from '../../data';
import { useT } from '../../i18n';
import { BOARD_SIZE, MAX_MISSES, evaluate, isShinyCandidate, pickRow, roundSeed, shinyIndex } from '../../lib/shiny';
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

  // Every cell is the same Pokémon; the round's seed decides which one is shiny.
  const shiny = useMemo(() => (round ? shinyIndex(roundSeed(round)) : -1), [round?.mode, round?.key]); // eslint-disable-line react-hooks/exhaustive-deps
  const picked = useMemo(() => new Set(round?.guesses), [round?.guesses]);
  const targetRef = useRef<HTMLButtonElement>(null);

  const over = round ? round.status !== 'playing' : false;
  // Once the round ends, bring the shiny into view so a loss still shows where it was.
  useEffect(() => {
    if (over) targetRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [over, round?.key]);

  if (!round) return null;
  const { misses } = evaluate(round.guesses, shiny);
  const won = round.status === 'won';

  return (
    <div className="space-y-5">
      <PuzzleHeader
        title={t('mode.shiny.title')}
        intro={
          round
            ? t('sh.intro', { name: byId.get(round.targetId)!.name, total: BOARD_SIZE, max: MAX_MISSES })
            : ''
        }
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
        <span className="min-h-[1.25rem] text-slate-600 dark:text-slate-300" aria-live="polite">
          {!over && round.guesses.length > 0 && `✗ ${t('sh.notShiny')}`}
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
        className="grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-1.5"
      >
        {Array.from({ length: BOARD_SIZE }, (_, i) => {
          const isShiny = i === shiny;
          const state: CellState = isShiny && over ? (won ? 'found' : 'revealed') : picked.has(i) ? 'wrong' : 'idle';
          return (
            <Cell
              key={i}
              id={round.targetId}
              index={i}
              state={state}
              // The shiny is the only sprite loaded from the shiny folder.
              shiny={isShiny}
              disabled={over || picked.has(i)}
              onPick={guess}
              refCb={isShiny ? targetRef : undefined}
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
  onPick: (index: number) => void;
  refCb?: React.RefObject<HTMLButtonElement>;
}) {
  const { t } = useT();
  return (
    <button
      ref={refCb}
      type="button"
      disabled={disabled}
      onClick={() => onPick(index)}
      aria-label={
        state === 'wrong' ? `${t('sh.cell', { n: index + 1 })} ✗` : state === 'idle' ? t('sh.cell', { n: index + 1 }) : `${t('sh.cell', { n: index + 1 })} ✨`
      }
      className={`relative flex h-[72px] items-center justify-center rounded-md border transition disabled:cursor-default ${CELL[state]}`}
    >
      <Sprite id={id} scale={1.2} shiny={shiny} className={state === 'wrong' ? 'opacity-40 grayscale' : ''} />
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
