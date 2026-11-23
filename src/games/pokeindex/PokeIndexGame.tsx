import { useEffect, useMemo, useState } from 'react';
import PokemonInput from '../../components/PokemonInput';
import Sprite from '../../components/Sprite';
import TypeBadge from '../../components/TypeBadge';
import { byId } from '../../data';
import { artworkUrl } from '../../data/sprites';
import { useT } from '../../i18n';
import { MAX_GUESSES, direction, formatDex, guessRow, hintsFor } from '../../lib/pokeindex';
import { usePokeIndexStore } from '../puzzle/stores';
import { GiveUp, PuzzleHeader, PuzzleResult, UnlimitedOptions } from '../puzzle/Chrome';

export default function PokeIndexGame() {
  const { t } = useT();
  const mode = usePokeIndexStore((s) => s.mode);
  const round = usePokeIndexStore((s) => (s.mode === 'daily' ? s.daily : s.unlimited));
  const generations = usePokeIndexStore((s) => s.generations);
  const stats = usePokeIndexStore((s) => s.stats[s.mode]);
  const { setMode, ensureRound, newUnlimited, guess, giveUp, setGenerations } = usePokeIndexStore.getState();

  // Create today's round / the first unlimited one as soon as the mode is on screen.
  useEffect(() => ensureRound(), [mode, ensureRound]);
  const guessed = useMemo(() => new Set(round?.guesses), [round?.guesses]);
  if (!round) return null;

  const target = byId.get(round.targetId)!;
  const over = round.status !== 'playing';
  const won = round.status === 'won';
  const misses = round.guesses.filter((g) => g !== round.targetId);
  const hints = hintsFor(misses.length);

  return (
    <div className="space-y-5">
      <PuzzleHeader
        title={t('mode.pokeindex.title')}
        intro={t('pi.intro', { max: MAX_GUESSES })}
        mode={mode}
        onMode={(m) => setMode(m)}
      />
      {mode === 'unlimited' && (
        <UnlimitedOptions generations={generations} onGenerations={setGenerations} onNew={() => newUnlimited()} />
      )}

      <section className="mx-auto max-w-xl rounded-2xl bg-white p-5 text-center shadow-lg dark:bg-slate-800 sm:p-8">
        <h2 className="font-pixel text-sm text-slate-500">{t('pi.which')}</h2>
        <p className="my-4 font-pixel text-5xl tracking-wider text-red-600 dark:text-red-400" aria-label={t('pi.number', { n: target.id })}>
          {formatDex(target.id)}
        </p>

        {!over && hints.length > 0 && (
          <div className="space-y-3 text-sm" aria-label={t('pi.hints')}>
            {hints.includes('generation') && (
              <p className="animate-pop">
                <span className="font-semibold text-slate-500">{t('pi.gen')}</span>{' '}
                {t('filter.gen', { n: target.generation })} · {target.region}
              </p>
            )}
            {hints.includes('types') && (
              <p className="animate-pop flex flex-wrap items-center justify-center gap-2">
                <span className="font-semibold text-slate-500">{t('pi.type')}</span>
                {target.types.map((ty) => (
                  <TypeBadge key={ty} type={ty} />
                ))}
              </p>
            )}
            {hints.includes('silhouette') && <Silhouette id={target.id} label={t('pi.silhouette')} />}
          </div>
        )}

        {over && (
          <div className="flex justify-center">
            <Sprite id={target.id} scale={2.5} className="animate-pop" />
          </div>
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

      {misses.length > 0 && (
        <ul className="mx-auto flex max-w-xl flex-wrap gap-2" aria-label={t('pi.misses')}>
          {misses.map((id) => {
            const dir = direction(id, round.targetId);
            return (
              <li
                key={id}
                className="flex animate-pop items-center gap-1 rounded-full bg-rose-50 py-0.5 pl-1 pr-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
              >
                <Sprite id={id} scale={0.5} /> ✗ {byId.get(id)!.name} {formatDex(id)}
                {/* The arrow points to where the answer is on the Pokédex. */}
                <span aria-label={t(dir === 'higher' ? 'pi.higher' : 'pi.lower')} title={t(dir === 'higher' ? 'pi.higher' : 'pi.lower')}>
                  {dir === 'higher' ? '▲' : '▼'}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {over && (
        <div className="mx-auto max-w-3xl">
          <PuzzleResult
            targetId={round.targetId}
            won={won}
            headline={won ? t('puz.gotIt', { n: round.guesses.length }) : t('puz.itWas')}
            stats={stats}
            daily={round.mode === 'daily'}
            onNext={() => newUnlimited()}
            shareText={() =>
              `Pokewwwww ${t('mode.pokeindex.title')} ${round.mode === 'daily' ? round.key : t('common.unlimitedKey')} · ${
                won ? round.guesses.length : 'X'
              }/${MAX_GUESSES}\n${guessRow(misses.length, won)}`
            }
          />
        </div>
      )}
    </div>
  );
}

/** The official artwork as a black shape, shown only once enough guesses have missed. */
function Silhouette({ id, label }: { id: number; label: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="animate-pop">
      <p className="mb-1 font-semibold text-slate-500">{label}</p>
      <div className="relative mx-auto flex aspect-square w-full max-w-[14rem] items-center justify-center">
        {!loaded && <div className="absolute inset-6 animate-pulse rounded-full bg-slate-100 dark:bg-slate-700" aria-hidden />}
        <img
          src={artworkUrl(id)}
          alt={label}
          draggable={false}
          onLoad={() => setLoaded(true)}
          onContextMenu={(e) => e.preventDefault()}
          className={`h-full w-full select-none object-contain transition duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          style={{ filter: 'brightness(0)' }}
        />
      </div>
    </div>
  );
}
