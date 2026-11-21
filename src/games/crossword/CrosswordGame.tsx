import { useCallback, useMemo, useRef, useState } from 'react';
import ShareButton from '../../components/ShareButton';
import Timer from '../../components/Timer';
import { todayKey } from '../../lib/rng';
import { formatClock } from '../../lib/timed';
import { placementCells, type Dir } from '../../lib/crossword/generator';
import { SIZES, isOver, useCrossStore, type CrossRound } from './store';
import Setup from './Setup';
import Grid from './Grid';
import ClueList from './ClueList';

export default function CrosswordGame() {
  const screen = useCrossStore((s) => s.screen);
  const round = useCrossStore((s) => s[s.settings.mode]);
  const stale = round?.mode === 'daily' && round.key !== todayKey();
  if (screen === 'setup' || !round || stale) return <Setup />;
  return <Game key={`${round.mode}:${round.key}`} round={round} />;
}

interface Cursor {
  idx: number;
  dir: Dir;
}

function Game({ round }: { round: CrossRound }) {
  const { setEntry, revealWord, reset, endPuzzle, toSetup, newUnlimited } = useCrossStore.getState();
  const { puzzle, entries } = round;
  const { width, height, placements } = puzzle;
  const solved = round.solvedAt !== null;
  const over = isOver(round);
  const ended = over && !solved;

  // Static lookups for this puzzle.
  const { solution, cellsOf, wordsAt, numbers } = useMemo(() => {
    const solution = puzzle.cells.flat();
    const cellsOf = new Map<number, number[]>();
    const wordsAt: Partial<Record<Dir, number>>[] = solution.map(() => ({}));
    const numbers: (number | null)[] = solution.map(() => null);
    for (const p of placements) {
      const cells = placementCells(p).map(([r, c]) => r * width + c);
      cellsOf.set(p.id, cells);
      cells.forEach((i) => (wordsAt[i][p.dir] = p.id));
      numbers[cells[0]] = p.number;
    }
    return { solution, cellsOf, wordsAt, numbers };
  }, [puzzle, placements, width]);

  const first = placements[0];
  const [cursor, setCursor] = useState<Cursor>({ idx: cellsOf.get(first.id)![0], dir: first.dir });
  const [wrong, setWrong] = useState<Set<number>>(new Set());
  const [checkMsg, setCheckMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'reset' | 'end' | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeId = wordsAt[cursor.idx][cursor.dir] ?? wordsAt[cursor.idx][cursor.dir === 'across' ? 'down' : 'across']!;
  const active = placements[activeId];
  const activeCells = useMemo(() => new Set(cellsOf.get(activeId)), [cellsOf, activeId]);
  const revealed = useMemo(() => new Set(round.revealed), [round.revealed]);
  const solvedIds = useMemo(
    () => new Set(placements.filter((p) => cellsOf.get(p.id)!.every((i) => entries[i] === solution[i])).map((p) => p.id)),
    [placements, cellsOf, entries, solution],
  );

  const focus = () => inputRef.current?.focus({ preventScroll: true });

  const selectWord = useCallback(
    (id: number) => {
      const cells = cellsOf.get(id)!;
      const firstEmpty = cells.find((i) => !entries[i]) ?? cells[0];
      setCursor({ idx: firstEmpty, dir: placements[id].dir });
      focus();
    },
    [cellsOf, entries, placements],
  );

  const onCellClick = (idx: number) => {
    const w = wordsAt[idx];
    if (idx === cursor.idx && w.across !== undefined && w.down !== undefined)
      setCursor({ idx, dir: cursor.dir === 'across' ? 'down' : 'across' });
    else setCursor({ idx, dir: w[cursor.dir] !== undefined ? cursor.dir : cursor.dir === 'across' ? 'down' : 'across' });
    focus();
  };

  const clearWrong = (idx: number) =>
    setWrong((w) => {
      if (!w.has(idx)) return w;
      const n = new Set(w);
      n.delete(idx);
      return n;
    });

  const typeLetter = (letter: string) => {
    if (over) return;
    setEntry(cursor.idx, letter);
    clearWrong(cursor.idx);
    setCheckMsg(null);
    const cells = cellsOf.get(activeId)!;
    const pos = cells.indexOf(cursor.idx);
    if (pos < cells.length - 1) setCursor({ idx: cells[pos + 1], dir: active.dir });
  };

  const backspace = () => {
    if (over) return;
    setCheckMsg(null);
    if (entries[cursor.idx]) {
      setEntry(cursor.idx, '');
      clearWrong(cursor.idx);
      return;
    }
    const cells = cellsOf.get(activeId)!;
    const pos = cells.indexOf(cursor.idx);
    if (pos > 0) {
      setEntry(cells[pos - 1], '');
      clearWrong(cells[pos - 1]);
      setCursor({ idx: cells[pos - 1], dir: active.dir });
    }
  };

  const move = (dr: number, dc: number) => {
    const dir: Dir = dc !== 0 ? 'across' : 'down';
    // First press in a new direction just turns, if a word runs that way.
    if (dir !== cursor.dir && wordsAt[cursor.idx][dir] !== undefined) {
      setCursor({ idx: cursor.idx, dir });
      return;
    }
    let r = Math.floor(cursor.idx / width) + dr;
    let c = (cursor.idx % width) + dc;
    while (r >= 0 && r < height && c >= 0 && c < width) {
      const i = r * width + c;
      if (solution[i] !== null) {
        setCursor({ idx: i, dir: wordsAt[i][dir] !== undefined ? dir : cursor.dir });
        return;
      }
      r += dr;
      c += dc;
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (/^[a-z]$/i.test(k)) typeLetter(k.toUpperCase());
    else if (k === 'Backspace') backspace();
    else if (k === 'Delete') setEntry(cursor.idx, '');
    else if (k === 'ArrowLeft') move(0, -1);
    else if (k === 'ArrowRight') move(0, 1);
    else if (k === 'ArrowUp') move(-1, 0);
    else if (k === 'ArrowDown') move(1, 0);
    else if (k === ' ') onCellClick(cursor.idx);
    else if (k === 'Tab') selectWord((activeId + (e.shiftKey ? placements.length - 1 : 1)) % placements.length);
    else return;
    e.preventDefault();
  };

  // Mobile keyboards often don't report keys on keydown; read the input instead.
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ch = e.target.value.slice(-1);
    if (/^[a-z]$/i.test(ch)) typeLetter(ch.toUpperCase());
    e.target.value = '';
  };

  const check = () => {
    const bad = new Set(entries.map((e, i) => (e && e !== solution[i] ? i : -1)).filter((i) => i >= 0));
    setWrong(bad);
    setCheckMsg(bad.size ? `${bad.size} wrong ${bad.size === 1 ? 'letter' : 'letters'}` : 'Everything so far is correct');
    focus();
  };

  const filled = entries.filter((e, i) => e && solution[i] !== null).length;
  const total = solution.filter((s) => s !== null).length;
  const btn =
    'rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold hover:border-slate-400 disabled:opacity-40 dark:border-slate-600';

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-pixel text-xl">Pokécross</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {round.mode === 'daily' ? `Daily · ${round.key}` : 'Unlimited'} · {SIZES[round.size].label} ·{' '}
            {round.difficulty} clues · {placements.length} words
          </p>
        </div>
        <div className="flex items-center gap-3">
          {over ? (
            <span className="font-mono text-2xl font-bold tabular-nums">
              {formatClock((round.solvedAt ?? round.endedAt!) - round.startedAt)}
            </span>
          ) : (
            <Timer startedAt={round.startedAt} endsAt={null} />
          )}
          <button type="button" className={btn} onClick={toSetup}>
            Options
          </button>
        </div>
      </header>

      {solved && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-emerald-50 p-4 dark:bg-emerald-950/40">
          <div>
            <p className="font-pixel text-sm text-emerald-700 dark:text-emerald-300">Solved!</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {formatClock(round.solvedAt! - round.startedAt)}
              {round.revealed.length
                ? ` · ${round.revealed.length} ${round.revealed.length === 1 ? 'letter' : 'letters'} revealed`
                : ' · no reveals'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ShareButton
              text={() =>
                `Pokewwww Pokécross ${round.mode === 'daily' ? round.key : '(unlimited)'} · ${SIZES[round.size].label} · ${
                  round.difficulty
                } clues\n✅ ${placements.length} words in ${formatClock(round.solvedAt! - round.startedAt)}${
                  round.revealed.length ? ` · ${round.revealed.length} letters revealed` : ' · no reveals'
                }`
              }
            />
            <button
              type="button"
              onClick={newUnlimited}
              className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white shadow hover:bg-red-700"
            >
              {round.mode === 'daily' ? 'Play unlimited' : 'New puzzle'}
            </button>
          </div>
        </section>
      )}

      {ended && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-200/70 p-4 dark:bg-slate-800">
          <div>
            <p className="font-pixel text-sm">Puzzle ended</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              The answers are filled in; the ones you didn&apos;t get are in blue.
              {round.mode === 'daily' ? ' A new daily puzzle comes tomorrow.' : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btn} onClick={toSetup}>
              Change options
            </button>
            <button
              type="button"
              onClick={newUnlimited}
              className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white shadow hover:bg-red-700"
            >
              {round.mode === 'daily' ? 'Play unlimited' : 'New puzzle'}
            </button>
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-3">
          {!over && (
            <div className="sticky top-0 z-10 -mx-4 bg-slate-100/95 px-4 py-2 backdrop-blur dark:bg-slate-900/95 lg:static lg:mx-0 lg:rounded-lg lg:bg-amber-100 lg:dark:bg-amber-900/40">
              <p className="text-sm">
                <strong>
                  {active.number} {active.dir === 'across' ? 'Across' : 'Down'}
                </strong>{' '}
                · {active.clue}
              </p>
            </div>
          )}

          <div className="relative">
            <input
              ref={inputRef}
              aria-label="Crossword letter input"
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
              onKeyDown={onKeyDown}
              onChange={onChange}
              className="absolute left-0 top-0 h-px w-px opacity-0"
            />
            <Grid
              puzzle={puzzle}
              entries={entries}
              numbers={numbers}
              activeIdx={cursor.idx}
              activeCells={activeCells}
              wrong={wrong}
              revealed={revealed}
              solved={solved}
              locked={over}
              onCellClick={onCellClick}
            />
          </div>

          {!over && (
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={btn} onClick={check} disabled={!filled}>
                Check
              </button>
              <button
                type="button"
                className={btn}
                onClick={() => {
                  revealWord(activeId);
                  focus();
                }}
              >
                Reveal word
              </button>
              {confirm ? (
                <span className="flex items-center gap-2 text-sm" role="group" aria-label="Confirm">
                  {confirm === 'reset' ? 'Clear every letter?' : 'Show the answers and end this puzzle?'}
                  <button
                    type="button"
                    className="rounded bg-red-600 px-2.5 py-1 font-semibold text-white"
                    onClick={() => {
                      if (confirm === 'reset') {
                        reset();
                        focus();
                      } else endPuzzle();
                      setWrong(new Set());
                      setConfirm(null);
                    }}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    className={btn}
                    onClick={() => {
                      setConfirm(null);
                      focus();
                    }}
                  >
                    No
                  </button>
                </span>
              ) : (
                <>
                  <button type="button" className={btn} onClick={() => setConfirm('reset')} disabled={!filled}>
                    Reset
                  </button>
                  <button
                    type="button"
                    className={`${btn} hover:border-red-500 hover:text-red-600`}
                    onClick={() => setConfirm('end')}
                  >
                    End puzzle
                  </button>
                </>
              )}
              <span className="ml-auto text-sm tabular-nums text-slate-500">
                {checkMsg ?? `${filled} / ${total} letters`}
              </span>
            </div>
          )}
          <p className="hidden text-xs text-slate-500 sm:block">
            Click a square to select it; click again to switch direction. Arrows move, Tab jumps to the next clue,
            Space switches direction.
          </p>
        </div>

        <aside className="lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-1">
          <ClueList
            placements={placements}
            activeId={over ? null : activeId}
            solvedIds={solvedIds}
            showSilhouettes={round.difficulty === 'easy'}
            onSelect={selectWord}
          />
        </aside>
      </div>
    </div>
  );
}
