import { useCallback, useEffect, useMemo, useState } from 'react';
import { useT, type TFn } from '../../i18n';
import PokemonInput from '../../components/PokemonInput';
import TypeBadge from '../../components/TypeBadge';
import type { PokeType } from '../../data';
import { guessRow, learnLabel, type Learn, MAX_GUESSES, movesShown, START_SHOWN, type MovesetData } from '../../lib/moveset';
import { useMovesetStore } from '../puzzle/stores';
import { GiveUp, PuzzleHeader, PuzzleResult, UnlimitedOptions, WrongGuesses } from '../puzzle/Chrome';

const CLASS_ICON: Record<string, string> = { physical: '💥', special: '🌀', status: '✨' };
const METHODS = ['machine', 'tutor', 'egg', 'reminder'];

const learnText = (t: TFn, l: Learn) =>
  typeof l === 'number'
    ? l === 0
      ? t('mv.evolution')
      : t('mv.level', { n: l })
    : METHODS.includes(l)
      ? t(`mv.m.${l}` as 'mv.m.machine')
      : learnLabel(l);

export default function MovesetGame() {
  const { t } = useT();
  // The move data is ~120 kB, so it loads only when this game opens.
  const [data, setData] = useState<MovesetData | null>(null);
  useEffect(() => {
    import('../../data/movesets.json').then((m) => setData(m.default as unknown as MovesetData));
  }, []);

  if (!data) return <p className="py-10 text-center text-sm text-slate-500">{t('mv.loading')}</p>;
  return <Moveset data={data} />;
}

function Moveset({ data }: { data: MovesetData }) {
  const { t } = useT();
  const mode = useMovesetStore((s) => s.mode);
  const round = useMovesetStore((s) => (s.mode === 'daily' ? s.daily : s.unlimited));
  const generations = useMovesetStore((s) => s.generations);
  const stats = useMovesetStore((s) => s.stats[s.mode]);
  const { setMode, ensureRound, newUnlimited, guess, giveUp, setGenerations } = useMovesetStore.getState();
  const eligible = useCallback((id: number) => !!data.sets[id], [data]);

  useEffect(() => ensureRound(eligible), [mode, ensureRound, eligible]);
  const guessed = useMemo(() => new Set(round?.guesses), [round?.guesses]);
  if (!round) return null;

  const set = data.sets[round.targetId];
  const moves = set?.moves ?? [];
  const over = round.status !== 'playing';
  const won = round.status === 'won';
  const misses = round.guesses.filter((g) => g !== round.targetId);
  const shown = movesShown(moves.length, misses.length, over);

  return (
    <div className="space-y-5">
      <PuzzleHeader
        title={t('mode.moveset.title')}
        intro={t('mv.intro', { start: START_SHOWN, max: MAX_GUESSES })}
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
        <h2 className="mb-3 text-center font-pixel text-sm text-slate-500">{t('mv.which')}</h2>
        <ol className="space-y-2">
          {moves.map(([slug, learn], i) => {
            const m = data.moves[slug];
            const visible = i < shown;
            const clsKey = m.cls in CLASS_ICON ? m.cls : 'status';
            const clsLabel = t(`mv.cls.${clsKey}` as 'mv.cls.status');
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
                    <span
                      className="w-[4.5rem] shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                      title={typeof learn === 'number' ? (learn === 0 ? t('mv.evolves') : t('mv.atLevel', { n: learn })) : t('mv.by', { how: learnText(t, learn) })}
                    >
                      {learnText(t, learn)}
                    </span>
                    <TypeBadge type={m.type as PokeType} />
                    <span className="hidden w-20 text-xs text-slate-500 sm:inline" title={clsLabel}>
                      <span aria-hidden>{CLASS_ICON[clsKey]}</span> {clsLabel}
                    </span>
                  </>
                ) : (
                  <span className="flex-1 text-sm">{t('mv.hidden')}</span>
                )}
              </li>
            );
          })}
        </ol>
        {/* The game would hint at the Pokémon's era, so it's only named once the round is over. */}
        {over && set?.vg != null && data.games[set.vg] && (
          <p className="mt-3 text-center text-xs text-slate-500">{t('mv.levelsFrom', { game: data.games[set.vg] })}</p>
        )}
      </section>

      {!over && (
        <div className="mx-auto flex max-w-xl flex-wrap items-start gap-3">
          <PokemonInput onSelect={guess} exclude={guessed} />
          <div className="flex items-center gap-3 py-2.5 text-sm">
            <span className="tabular-nums text-slate-600 dark:text-slate-300">
              {t('puz.guessOf', { n: round.guesses.length + 1, max: MAX_GUESSES })}
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
            headline={won ? t('puz.gotIt', { n: round.guesses.length }) : t('puz.itWas')}
            stats={stats}
            daily={round.mode === 'daily'}
            onNext={() => newUnlimited(eligible)}
            shareText={() =>
              `Pokewwwww ${t('mode.moveset.title')} ${round.mode === 'daily' ? round.key : t('common.unlimitedKey')} · ${
                won ? round.guesses.length : 'X'
              }/${MAX_GUESSES}\n${guessRow(misses.length, won)}`
            }
          />
        </div>
      )}
    </div>
  );
}
