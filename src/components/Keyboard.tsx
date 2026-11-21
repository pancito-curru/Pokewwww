import { useEffect } from 'react';
import type { LetterState } from '../lib/wordle';

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', '⏎ZXCVBNM⌫'];
const LETTER_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

const STYLE: Record<LetterState | 'none', string> = {
  none: 'bg-slate-200 text-slate-900 hover:bg-slate-300 dark:bg-slate-600 dark:text-white dark:hover:bg-slate-500',
  correct: 'bg-emerald-500 text-white',
  present: 'bg-amber-400 text-slate-900',
  absent: 'bg-slate-400 text-white dark:bg-slate-800 dark:text-slate-500',
};

interface Props {
  states: Record<string, LetterState>;
  onKey: (key: string) => void;
  /** Omit both onEnter and onBackspace for a letters-only keyboard (Hangman). */
  onEnter?: () => void;
  onBackspace?: () => void;
  disabled?: boolean;
}

/** On-screen keyboard that also listens to the physical one. */
export default function Keyboard({ states, onKey, onEnter, onBackspace, disabled }: Props) {
  useEffect(() => {
    if (disabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Enter' && onEnter) onEnter();
      else if (e.key === 'Backspace' && onBackspace) onBackspace();
      else if (/^[a-z]$/i.test(e.key)) onKey(e.key.toUpperCase());
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onKey, onEnter, onBackspace, disabled]);

  return (
    <div className="mx-auto w-full max-w-lg select-none space-y-1.5" aria-label="Keyboard">
      {(onEnter || onBackspace ? ROWS : LETTER_ROWS).map((row) => (
        <div key={row} className="flex justify-center gap-1.5">
          {[...row].map((k) => {
            const wide = k === '⏎' || k === '⌫';
            return (
              <button
                key={k}
                type="button"
                disabled={disabled}
                onClick={(e) => {
                  (e.currentTarget as HTMLButtonElement).blur();
                  if (k === '⏎') onEnter?.();
                  else if (k === '⌫') onBackspace?.();
                  else onKey(k);
                }}
                aria-label={k === '⏎' ? 'Enter' : k === '⌫' ? 'Backspace' : k}
                className={`h-12 rounded-md text-sm font-bold transition disabled:opacity-60 ${
                  wide ? 'flex-[1.5] text-base' : 'flex-1'
                } ${STYLE[states[k] ?? 'none']}`}
              >
                {k === '⏎' ? 'Enter' : k}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
