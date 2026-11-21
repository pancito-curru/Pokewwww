import { memo } from 'react';
import type { Crossword } from '../../lib/crossword/generator';

interface Props {
  puzzle: Crossword;
  entries: string[];
  numbers: (number | null)[];
  activeIdx: number;
  activeCells: ReadonlySet<number>;
  wrong: ReadonlySet<number>;
  revealed: ReadonlySet<number>;
  solved: boolean;
  onCellClick: (idx: number) => void;
}

const Cell = memo(function Cell({
  idx,
  solution,
  entry,
  number,
  active,
  inWord,
  wrong,
  revealed,
  solved,
  onClick,
}: {
  idx: number;
  solution: string | null;
  entry: string;
  number: number | null;
  active: boolean;
  inWord: boolean;
  wrong: boolean;
  revealed: boolean;
  solved: boolean;
  onClick: (idx: number) => void;
}) {
  if (solution === null) return <div className="bg-transparent" aria-hidden />;
  const bg = solved
    ? 'bg-emerald-50 dark:bg-emerald-950/50'
    : active
      ? 'bg-amber-300 dark:bg-amber-600'
      : wrong
        ? 'bg-rose-100 dark:bg-rose-950/60'
        : inWord
          ? 'bg-amber-100 dark:bg-amber-900/40'
          : 'bg-white dark:bg-slate-800';
  const color = wrong
    ? 'text-rose-600 dark:text-rose-400'
    : revealed
      ? 'text-sky-600 dark:text-sky-400'
      : 'text-slate-900 dark:text-white';
  return (
    <div
      role="gridcell"
      onMouseDown={(e) => {
        e.preventDefault(); // keep focus on the hidden input
        onClick(idx);
      }}
      className={`relative flex aspect-square cursor-pointer select-none items-center justify-center border border-slate-400 font-bold uppercase dark:border-slate-600 ${bg} ${color}`}
      style={{ fontSize: 'clamp(0.7rem, 3.2vw, 1.25rem)' }}
      aria-label={`${number ? `${number}, ` : ''}${entry || 'empty'}`}
    >
      {number && (
        <span className="absolute left-0.5 top-0 text-[8px] font-semibold leading-none text-slate-500 sm:text-[10px] dark:text-slate-400">
          {number}
        </span>
      )}
      {entry}
    </div>
  );
});

export default function Grid({ puzzle, entries, numbers, activeIdx, activeCells, wrong, revealed, solved, onCellClick }: Props) {
  const flat = puzzle.cells.flat();
  return (
    <div
      role="grid"
      aria-label="Crossword"
      className="grid w-full"
      style={{ gridTemplateColumns: `repeat(${puzzle.width}, minmax(0, 1fr))`, maxWidth: `${puzzle.width * 2.6}rem` }}
    >
      {flat.map((solution, idx) => (
        <Cell
          key={idx}
          idx={idx}
          solution={solution}
          entry={entries[idx]}
          number={numbers[idx]}
          active={!solved && idx === activeIdx}
          inWord={!solved && activeCells.has(idx)}
          wrong={wrong.has(idx)}
          revealed={revealed.has(idx)}
          solved={solved}
          onClick={onCellClick}
        />
      ))}
    </div>
  );
}
