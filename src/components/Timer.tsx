import { useEffect, useState } from 'react';
import { formatClock } from '../lib/timed';

interface Props {
  startedAt: number;
  /** Countdown target; null counts up from startedAt. */
  endsAt: number | null;
  onExpire?: () => void;
}

/** Self-ticking clock. Isolated so the rest of the game doesn't re-render every tick. */
export default function Timer({ startedAt, endsAt, onExpire }: Props) {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const expired = endsAt != null && now >= endsAt;
  useEffect(() => {
    if (expired) onExpire?.();
  }, [expired, onExpire]);

  const ms = endsAt != null ? endsAt - now : now - startedAt;
  const low = endsAt != null && ms <= 30_000;
  return (
    <span
      className={`font-mono text-2xl font-bold tabular-nums ${low ? 'animate-pulse text-red-600 dark:text-red-400' : ''}`}
      role="timer"
      aria-label={endsAt != null ? 'Time left' : 'Time elapsed'}
    >
      {formatClock(ms)}
    </span>
  );
}
