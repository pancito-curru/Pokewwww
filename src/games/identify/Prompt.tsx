import { useEffect, useRef, useState } from 'react';
import { byId } from '../../data';
import { artworkUrl, cryUrl } from '../../data/sprites';
import TypeBadge from '../../components/TypeBadge';
import type { IdentifyKind } from './kinds';

interface Props {
  kind: IdentifyKind;
  id: number;
  revealed: boolean;
  /** Tint of the reveal ring. */
  outcome?: 'correct' | 'missed' | 'skipped' | null;
  /** Preload these next answers so the run never waits on the network. */
  preload?: number[];
}

const RING: Record<string, string> = {
  correct: 'ring-4 ring-emerald-400',
  missed: 'ring-4 ring-rose-400',
  skipped: 'ring-4 ring-slate-300 dark:ring-slate-600',
};

/** The centered card: a silhouette or a cry, then the Pokémon once revealed. */
export default function Prompt({ kind, id, revealed, outcome, preload = [] }: Props) {
  const p = byId.get(id)!;
  useEffect(() => {
    for (const next of preload) {
      if (kind === 'silhouette') new Image().src = artworkUrl(next);
      else {
        const a = new Audio();
        a.preload = 'auto';
        a.src = cryUrl(next);
      }
    }
  }, [kind, preload]);

  return (
    <div className="flex justify-center">
      <div
        className={`relative flex w-full max-w-sm flex-col items-center rounded-2xl bg-white p-6 shadow-lg transition dark:bg-slate-800 ${
          revealed && outcome ? RING[outcome] : ''
        }`}
      >
        {kind === 'silhouette' ? (
          <Artwork id={id} hidden={!revealed} />
        ) : revealed ? (
          <Artwork id={id} hidden={false} />
        ) : (
          <CryPlayer id={id} />
        )}

        <div className="mt-4 flex min-h-[3.5rem] flex-col items-center justify-center text-center">
          {revealed ? (
            <>
              <p className="animate-pop text-2xl font-bold">
                {p.name} <span className="font-mono text-sm font-normal text-slate-400">#{p.id}</span>
              </p>
              <div className="mt-1 flex gap-1">
                {p.types.map((t) => (
                  <TypeBadge key={t} type={t} />
                ))}
              </div>
            </>
          ) : (
            <p className="font-pixel text-sm text-slate-500">Who&apos;s that Pokémon?</p>
          )}
        </div>

        {kind === 'cry' && revealed && <CryPlayer id={id} compact />}
      </div>
    </div>
  );
}

function Artwork({ id, hidden }: { id: number; hidden: boolean }) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => setLoaded(false), [id]);
  return (
    <div className="relative flex aspect-square w-full max-w-[18rem] items-center justify-center">
      {!loaded && <div className="absolute inset-6 animate-pulse rounded-full bg-slate-100 dark:bg-slate-700" aria-hidden />}
      <img
        key={id}
        src={artworkUrl(id)}
        alt={hidden ? 'Silhouette of a Pokémon' : byId.get(id)!.name}
        draggable={false}
        onLoad={() => setLoaded(true)}
        onContextMenu={(e) => hidden && e.preventDefault()}
        className={`h-full w-full select-none object-contain transition duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        style={{ filter: hidden ? 'brightness(0)' : 'none' }}
      />
    </div>
  );
}

const canPlayOgg = () =>
  typeof Audio !== 'undefined' && new Audio().canPlayType('audio/ogg; codecs="vorbis"') !== '';

/** Big play button for a cry. Tries to autoplay; browsers may need a tap first. */
function CryPlayer({ id, compact = false }: { id: number; compact?: boolean }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [failed, setFailed] = useState(false);

  const play = () => {
    const a = audio.current;
    if (!a) return;
    a.currentTime = 0;
    a.play().then(
      () => setBlocked(false),
      (e: DOMException) => {
        if (audio.current !== a) return;
        if (e.name === 'NotAllowedError') setBlocked(true);
        else if (e.name === 'NotSupportedError') setFailed(true);
        // AbortError: playback was interrupted (e.g. a new cry loaded); not a failure.
      },
    );
  };

  useEffect(() => {
    const a = new Audio(cryUrl(id));
    a.volume = 0.6;
    a.onplay = () => setPlaying(true);
    a.onended = a.onpause = () => setPlaying(false);
    a.onerror = () => audio.current === a && setFailed(true);
    audio.current = a;
    setFailed(false);
    setBlocked(false);
    if (!compact) play();
    return () => {
      // Detach handlers first: clearing src fires an "error" we don't want to report.
      a.onplay = a.onended = a.onpause = a.onerror = null;
      a.pause();
      a.removeAttribute('src');
      a.load();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, compact]);

  if (compact)
    return (
      <button
        type="button"
        onClick={play}
        className="mt-3 rounded-full border border-slate-300 px-4 py-1.5 text-sm font-semibold hover:border-slate-400 dark:border-slate-600"
      >
        🔊 Play cry again
      </button>
    );

  if (failed || !canPlayOgg())
    return (
      <p className="flex aspect-square w-full max-w-[18rem] items-center justify-center p-6 text-center text-sm text-rose-600 dark:text-rose-400">
        This browser can&apos;t play the cry (Ogg audio). Try Chrome, Firefox or Edge, or update Safari.
      </p>
    );

  return (
    <div className="flex aspect-square w-full max-w-[18rem] flex-col items-center justify-center">
      <button
        type="button"
        onClick={play}
        aria-label="Play the cry"
        className={`relative flex h-40 w-40 items-center justify-center rounded-full bg-red-600 text-6xl text-white shadow-lg transition hover:scale-105 hover:bg-red-700 active:scale-95 ${
          playing ? 'animate-pulse' : ''
        }`}
      >
        {playing && <span className="absolute inset-0 animate-ping rounded-full bg-red-500 opacity-30" aria-hidden />}
        <span aria-hidden>{playing ? '🔊' : '▶'}</span>
      </button>
      <p className="mt-4 text-sm text-slate-500">{blocked ? 'Tap to play the cry' : 'Tap to replay'}</p>
    </div>
  );
}
