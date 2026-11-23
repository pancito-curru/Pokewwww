import { useEffect, useMemo, useState } from 'react';
import FilterPanel from '../../components/FilterPanel';
import PokemonInput from '../../components/PokemonInput';
import { getPool, POKEDEX } from '../../data';
import { useT } from '../../i18n';
import { useGuessStore, HARD_MAX_GUESSES, type GuessMode } from './store';
import GuessTable, { Legend } from './GuessTable';
import HintPanel from './HintPanel';
import ResultCard from './ResultCard';

export default function GuessGame() {
  const { t } = useT();
  const mode = useGuessStore((s) => s.mode);
  const round = useGuessStore((s) => (s.mode === 'daily' ? s.daily : s.unlimited));
  const { setMode, ensureRound, guess, giveUp, newUnlimited } = useGuessStore.getState();
  const [confirmGiveUp, setConfirmGiveUp] = useState(false);

  useEffect(() => ensureRound(), [mode, ensureRound]);
  useEffect(() => setConfirmGiveUp(false), [round?.key]);

  const guessed = useMemo(() => new Set(round?.guesses), [round?.guesses]);
  if (!round) return null;
  const playing = round.status === 'playing';

  const tab = (m: GuessMode, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === m}
      onClick={() => setMode(m)}
      className={`rounded-md px-4 py-1.5 text-sm font-semibold transition ${
        mode === m ? 'bg-white shadow dark:bg-slate-700' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-pixel text-xl">{t('mode.guess.title')}</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {mode === 'daily'
              ? t('gs.introDaily', { total: POKEDEX.length })
              : t('gs.introUnlimited', {
                  from: round.generations.length ? t('gs.gens', { list: round.generations.join(', ') }) : t('gs.every'),
                })}
          </p>
        </div>
        <div role="tablist" className="flex rounded-lg bg-slate-200 p-1 dark:bg-slate-800">
          {tab('daily', t('tab.daily'))}
          {tab('unlimited', t('mode.unlimited'))}
        </div>
      </header>

      {mode === 'unlimited' && <UnlimitedOptions onNew={newUnlimited} />}

      {playing ? (
        <div className="flex flex-wrap items-start gap-3">
          <PokemonInput onSelect={guess} exclude={guessed} />
          <div className="flex items-center gap-3 py-2.5 text-sm">
            <span className="tabular-nums text-slate-600 dark:text-slate-300">
              {round.maxGuesses
                ? t('puz.guessOf', { n: round.guesses.length + 1, max: round.maxGuesses })
                : t('gs.guessN', { n: round.guesses.length + 1 })}
            </span>
            {round.guesses.length > 0 &&
              (confirmGiveUp ? (
                <span className="flex items-center gap-2">
                  {t('common.giveUpQ')}
                  <button type="button" onClick={giveUp} className="rounded bg-red-600 px-2.5 py-1 font-semibold text-white">
                    {t('common.yes')}
                  </button>
                  <button type="button" onClick={() => setConfirmGiveUp(false)} className="rounded border border-slate-300 px-2.5 py-1 dark:border-slate-600">
                    {t('common.no')}
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmGiveUp(true)}
                  className="rounded border border-slate-300 px-2.5 py-1 hover:border-red-500 hover:text-red-600 dark:border-slate-600"
                >
                  {t('common.giveUp')}
                </button>
              ))}
          </div>
        </div>
      ) : (
        <ResultCard round={round} />
      )}

      <HintPanel round={round} />
      {round.guesses.length > 0 && <Legend />}
      <GuessTable guesses={round.guesses} targetId={round.targetId} />
    </div>
  );
}

function UnlimitedOptions({ onNew }: { onNew: () => void }) {
  const { t } = useT();
  const settings = useGuessStore((s) => s.settings);
  const setSettings = useGuessStore((s) => s.setSettings);
  const size = getPool({ generations: settings.generations }).length;
  return (
    <details className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800/60">
      <summary className="cursor-pointer text-sm font-semibold">{t('puz.options')}</summary>
      <div className="mt-3 space-y-3">
        <FilterPanel value={settings.generations} onChange={(generations) => setSettings({ generations })} />
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-red-600"
            checked={settings.hard}
            onChange={(e) => setSettings({ hard: e.target.checked })}
          />
          {t('gs.hard', { max: HARD_MAX_GUESSES })}
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onNew}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            {t('puz.new')}
          </button>
          <span className="text-xs text-slate-500">{t('gs.possible', { n: size })}</span>
        </div>
      </div>
    </details>
  );
}
