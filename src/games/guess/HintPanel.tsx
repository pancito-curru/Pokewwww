import { byId } from '../../data';
import Sprite from '../../components/Sprite';
import { HINTS, hintUnlocks, useGuessStore, type GuessRound, type HintKey } from './store';

const LABEL: Record<HintKey, string> = { genus: 'Category', flavor: 'Pokédex entry', silhouette: 'Silhouette' };

export default function HintPanel({ round }: { round: GuessRound }) {
  const revealHint = useGuessStore((s) => s.revealHint);
  const target = byId.get(round.targetId)!;
  const unlocks = hintUnlocks(round.maxGuesses);
  const ended = round.status !== 'playing';

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {HINTS.map((h) => {
        const used = round.hintsUsed.includes(h);
        const left = unlocks[h] - round.guesses.length;
        const shown = used || ended;
        return (
          <div
            key={h}
            className="flex min-h-[5.5rem] flex-col rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800/60"
          >
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{LABEL[h]}</div>
            {shown ? (
              h === 'genus' ? (
                <p className="font-semibold">{target.genus || 'Unknown'}</p>
              ) : h === 'flavor' ? (
                <p className="italic text-slate-700 dark:text-slate-300">“{target.flavor || 'No entry'}”</p>
              ) : (
                <Sprite id={target.id} scale={1.5} silhouette={!ended} className="self-center" />
              )
            ) : left > 0 ? (
              <p className="text-slate-400">
                Unlocks in {left} {left === 1 ? 'guess' : 'guesses'}
              </p>
            ) : (
              <button
                type="button"
                onClick={() => revealHint(h)}
                className="mt-auto self-start rounded border border-red-500 px-3 py-1 text-sm font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                Reveal hint
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
