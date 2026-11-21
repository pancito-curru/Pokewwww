import { useCallback, useEffect, useMemo, useState } from 'react';
import PokemonInput from '../../components/PokemonInput';
import TypeBadge from '../../components/TypeBadge';
import type { PokeType } from '../../data';
import { guessRow, MAX_GUESSES, movesShown, START_SHOWN, type MovesetData } from '../../lib/moveset';
import { useMovesetStore } from '../puzzle/stores';
import { GiveUp, PuzzleHeader, PuzzleResult, UnlimitedOptions, WrongGuesses } from '../puzzle/Chrome';

const CLASS_LABEL: Record<string, { icon: string; label: string }> = {
  physical: { icon: '💥', label: 'Physical' },
  special: { icon: '🌀', label: 'Special' },
  status: { icon: '✨', label: 'Status' },
};

export default function MovesetGame() {
  // The move data is ~120 kB, so it loads only when this game opens.
  const [data, setData] = useState<MovesetData | null>(null);
  useEffect(() => {
    import('../../data/movesets.json').then((m) => setData(m.default as MovesetData));
  }, []);

  if (!data) return <p className="py-10 text-center text-sm text-slate-500">Loading moves…</p>;
  return <Moveset data={data} />;
}

function Moveset({ data }: { data: MovesetData }) {
  const mode = useMovesetStore((s) => s.mode);
  const round = useMovesetStore((s) => (s.mode === 'daily' ? s.daily : s.unlimited));
  const generations = useMovesetStore((s) => s.generations);
  const stats = useMovesetStore((s) => s.stats[s.mode]);
  const { setMode, ensureRound, newUnlimited, guess, giveUp, setGenerations } = useMovesetStore.getState();
  const eligible = useCallback((id: number) => !!data.sets[id], [data]);

  useEffect(() => ensureRound(eligible), [mode, ensureRound, eligible]);
  const guessed = useMemo(() => new Set(round?.guesses), [round?.guesses]);
  if (!round) return null;

  const moves = data.sets[round.targetId] ?? [];
  const over = round.status !== 'playing';
  const won = round.status === 'won';
  const misses = round.guesses.filter((g) => g !== round.targetId);
  const shown = movesShown(moves.length, misses.length, over);

  return (
    <div className="space-y-5">
      <PuzzleHeader
        title="Moveset"
        intro={`Name the Pokémon from the moves it learns. You start with ${START_SHOWN}; each miss reveals another. ${MAX_GUESSES} guesses.`}
        mode={mode}
        onMode={(m) => setMode(m, eligible)}
      />
      {mode === 'unlimited' && (
        <UnlimitedOptions
          generations={generations}
          onGenerations={setGenerations}
          onNew={() => newUnlimited(eligible)}
          eligible={eligible}
        />
      )}

      <section className="mx-auto max-w-xl rounded-2xl bg-white p-4 shadow-lg dark:bg-slate-800 sm:p-6">
        <h2 className="mb-3 text-center font-pixel text-sm text-slate-500">Which Pokémon learns…</h2>
        <ol className="space-y-2">
          {moves.map((slug, i) => {
            const m = data.moves[slug];
            const visible = i < shown;
            const cls = CLASS_LABEL[m.cls] ?? CLASS_LABEL.status;
            return (
              <li
                key={slug}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
                  visible
                    ? 'animate-pop border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40'
                    : 'border-dashed border-slate-300 text-slate-400 dark:border-slate-600'
                }`}
              >
                <span className="w-5 text-right text-xs font-bold tabular-nums text-slate-400">{i + 1}</span>
                {visible ? (
                  <>
                    <span className="flex-1 font-semibold">{m.name}</span>
                    <TypeBadge type={m.type as PokeType} />
                    <span className="hidden w-20 text-xs text-slate-500 sm:inline" title={cls.label}>
                      <span aria-hidden>{cls.icon}</span> {cls.label}
                    </span>
                  </>
                ) : (
                  <span className="flex-1 text-sm">??? · revealed after a miss</span>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {!over && (
        <div className="mx-auto flex max-w-xl flex-wrap items-start gap-3">
          <PokemonInput onSelect={guess} exclude={guessed} />
          <div className="flex items-center gap-3 py-2.5 text-sm">
            <span className="tabular-nums text-slate-600 dark:text-slate-300">
              Guess {round.guesses.length + 1} of {MAX_GUESSES}
            </span>
            {round.guesses.length > 0 && <GiveUp onConfirm={giveUp} />}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-xl">
        <WrongGuesses ids={misses} />
      </div>

      {over && (
        <div className="mx-auto max-w-3xl">
          <PuzzleResult
            targetId={round.targetId}
            won={won}
            headline={won ? `Got it in ${round.guesses.length}!` : 'It was…'}
            stats={stats}
            daily={round.mode === 'daily'}
            onNext={() => newUnlimited(eligible)}
            shareText={() =>
              `Pokewwwww Moveset ${round.mode === 'daily' ? round.key : '(unlimited)'} · ${
                won ? round.guesses.length : 'X'
              }/${MAX_GUESSES}\n${guessRow(misses.length, won)}`
            }
          />
        </div>
      )}
    </div>
  );
}
