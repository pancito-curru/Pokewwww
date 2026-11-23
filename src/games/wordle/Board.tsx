import { useT } from '../../i18n';
import { memo } from 'react';
import { score, type LetterState } from '../../lib/wordle';

interface Props {
  length: number;
  rows: number;
  guesses: string[];
  answer: string;
  current: string;
  shake: boolean;
  onShakeEnd: () => void;
}

const TILE: Record<LetterState, string> = {
  correct: 'border-emerald-500 bg-emerald-500 text-white',
  present: 'border-amber-400 bg-amber-400 text-slate-900',
  absent: 'border-slate-400 bg-slate-400 text-white dark:border-slate-700 dark:bg-slate-700',
};

const SubmittedRow = memo(function SubmittedRow({ guess, answer }: { guess: string; answer: string }) {
  const { t } = useT();
  const states = score(guess, answer);
  return (
    <>
      {[...guess].map((ch, i) => (
        <div
          key={i}
          className={`tile animate-flip ${TILE[states[i]]}`}
          style={{ animationDelay: `${i * 110}ms` }}
          aria-label={`${ch} ${t(`wd.state.${states[i]}`)}`}
        >
          {ch}
        </div>
      ))}
    </>
  );
});

export default function Board({ length, rows, guesses, answer, current, shake, onShakeEnd }: Props) {
  const { t } = useT();
  const cols = { gridTemplateColumns: `repeat(${length}, minmax(0, 3.25rem))` };
  return (
    <div className="flex flex-col items-center gap-1.5" role="grid" aria-label={t('wd.guesses')}>
      {Array.from({ length: rows }, (_, r) => {
        const guess = guesses[r];
        const isCurrent = r === guesses.length;
        return (
          <div
            key={r}
            role="row"
            className={`grid w-full justify-center gap-1.5 ${isCurrent && shake ? 'animate-shake' : ''}`}
            style={cols}
            onAnimationEnd={isCurrent ? onShakeEnd : undefined}
          >
            {guess ? (
              <SubmittedRow guess={guess} answer={answer} />
            ) : (
              Array.from({ length }, (_, i) => {
                const ch = isCurrent ? current[i] : undefined;
                return (
                  <div
                    key={i}
                    className={`tile border-slate-300 dark:border-slate-600 ${
                      ch ? 'animate-pop border-slate-500 dark:border-slate-400' : ''
                    }`}
                  >
                    {ch ?? ''}
                  </div>
                );
              })
            )}
          </div>
        );
      })}
    </div>
  );
}
