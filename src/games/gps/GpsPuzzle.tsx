import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PokemonInput from '../../components/PokemonInput';
import TypeBadge from '../../components/TypeBadge';
import { byId, POKEDEX } from '../../data';
import { useT } from '../../i18n';
import {
  HINT_AFTER,
  MAX_GUESSES,
  buildClue,
  fits,
  guessRow,
  hasEncounters,
  roundSeed,
  type LocationData,
} from '../../lib/gps';
import { useGpsStore } from '../puzzle/stores';
import { GiveUp, PuzzleHeader, PuzzleResult, UnlimitedOptions, WrongGuesses } from '../puzzle/Chrome';

const chip = 'rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200';

export default function GpsPuzzle({ data }: { data: LocationData }) {
  const { t } = useT();
  const navigate = useNavigate();
  const mode = useGpsStore((s) => s.mode);
  const round = useGpsStore((s) => (s.mode === 'daily' ? s.daily : s.unlimited));
  const generations = useGpsStore((s) => s.generations);
  const stats = useGpsStore((s) => s.stats[s.mode]);
  const { setMode, ensureRound, newUnlimited, guess, giveUp, setGenerations } = useGpsStore.getState();

  const candidates = useMemo(() => POKEDEX.filter((p) => hasEncounters(data, p.id)), [data]);
  const eligible = useCallback((id: number) => hasEncounters(data, id), [data]);
  // A look-alike answer that was accepted for the target, to say so in the result.
  const [alt, setAlt] = useState<number | null>(null);

  useEffect(() => ensureRound(eligible), [mode, ensureRound, eligible]);
  useEffect(() => setAlt(null), [round?.key, round?.mode]);

  const target = round ? byId.get(round.targetId)! : null;
  const clue = useMemo(
    () => (round && target ? buildClue(data, target, roundSeed(round), candidates) : null),
    [data, round?.key, round?.mode, round?.targetId], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const guessed = useMemo(() => new Set(round?.guesses), [round?.guesses]);
  if (!round || !target || !clue) return null;

  const over = round.status !== 'playing';
  const won = round.status === 'won';
  const misses = round.guesses.filter((g) => g !== round.targetId);
  const showHint = misses.length >= HINT_AFTER;

  const onSelect = (id: number) => {
    const g = byId.get(id)!;
    // Several Pokémon can fit a clue; any that does counts as the answer.
    if (id !== round.targetId && fits(data, clue, g)) {
      setAlt(id);
      guess(round.targetId);
    } else guess(id);
  };

  return (
    <div className="space-y-5">
      <PuzzleHeader
        title={t('mode.gps.title')}
        intro={t('gps.intro', { max: MAX_GUESSES, hint: HINT_AFTER })}
        mode={mode}
        onMode={(m) => setMode(m, eligible)}
        explore={{ label: t('gps.explore'), active: false, onSelect: () => navigate('/gps/map') }}
      />
      {mode === 'unlimited' && (
        <UnlimitedOptions
          generations={generations}
          onGenerations={setGenerations}
          onNew={() => newUnlimited(eligible)}
          eligible={eligible}
        />
      )}

      <section className="mx-auto max-w-xl space-y-4 rounded-2xl bg-white p-4 shadow-lg dark:bg-slate-800 sm:p-6">
        <h2 className="text-center font-pixel text-sm text-slate-500">{t('gps.where')}</h2>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-sm font-semibold text-slate-500">{t('gps.type')}</span>
          {clue.types.map((ty) => (
            <TypeBadge key={ty} type={ty} />
          ))}
        </div>

        <ul className="space-y-1.5" aria-label={t('gps.places')}>
          {clue.spots.map((s) => (
            <li
              key={s.loc}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/40"
            >
              <span aria-hidden>📍</span>
              <span className="flex-1 font-semibold">{s.name}</span>
              <span className={chip}>{s.region}</span>
            </li>
          ))}
          {clue.more > 0 && (
            <li className="text-center text-xs text-slate-500">{t('gps.more', { count: clue.more })}</li>
          )}
        </ul>

        {clue.extras && (
          <div className="rounded-lg bg-amber-50 p-3 text-sm dark:bg-amber-900/20">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              {t('gps.extras')}
            </p>
            <div className="flex flex-wrap gap-2">
              <span className={chip}>{t('gps.stage', { n: clue.extras.stage })}</span>
              <span className={chip}>{t('gps.gen', { n: clue.extras.generation })}</span>
              <span className={chip}>
                {clue.extras.min === clue.extras.max
                  ? t('gps.level', { n: clue.extras.min })
                  : t('gps.levels', { min: clue.extras.min, max: clue.extras.max })}
              </span>
            </div>
          </div>
        )}

        {(showHint || over) && target.flavor && (
          <blockquote className="animate-pop rounded-lg border-l-4 border-red-500 bg-slate-50 p-3 text-sm italic text-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
            <span className="mb-1 block text-xs font-semibold not-italic uppercase tracking-wide text-slate-500">
              {t('gps.entry')}
            </span>
            “{target.flavor}”
          </blockquote>
        )}
      </section>

      {!over && (
        <div className="mx-auto flex max-w-xl flex-wrap items-start gap-3">
          <PokemonInput onSelect={onSelect} exclude={guessed} />
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
        <div className="mx-auto max-w-3xl space-y-2">
          {alt !== null && won && (
            <p className="rounded-lg bg-emerald-50 p-3 text-center text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
              {t('gps.alsoFits', { name: byId.get(alt)!.name })}
            </p>
          )}
          <PuzzleResult
            targetId={round.targetId}
            won={won}
            headline={won ? t('puz.gotIt', { n: round.guesses.length }) : t('puz.itWas')}
            stats={stats}
            daily={round.mode === 'daily'}
            onNext={() => newUnlimited(eligible)}
            shareText={() =>
              `Pokewwwww ${t('mode.gps.title')} ${round.mode === 'daily' ? round.key : t('common.unlimitedKey')} · ${
                won ? round.guesses.length : 'X'
              }/${MAX_GUESSES}\n${guessRow(misses.length, won)}`
            }
          />
        </div>
      )}
    </div>
  );
}
