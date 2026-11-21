import { useState } from 'react';

/** Copies spoiler-free result text to the clipboard. */
export default function ShareButton({ text, className = '' }: { text: () => string; className?: string }) {
  const [state, setState] = useState<'idle' | 'ok' | 'fail'>('idle');
  const share = async () => {
    try {
      await navigator.clipboard.writeText(text());
      setState('ok');
    } catch {
      setState('fail');
    }
    setTimeout(() => setState('idle'), 2000);
  };
  return (
    <button
      type="button"
      onClick={share}
      className={`rounded-lg border border-slate-300 px-4 py-2 font-semibold hover:border-slate-400 dark:border-slate-600 ${className}`}
    >
      {state === 'ok' ? 'Copied!' : state === 'fail' ? "Couldn't copy" : 'Share result'}
    </button>
  );
}
