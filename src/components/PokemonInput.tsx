import { useT } from '../i18n';
import { useId, useMemo, useRef, useState } from 'react';
import { findByInput } from '../data';
import { searchPokemon } from '../lib/search';
import Sprite from './Sprite';

interface Props {
  onSelect: (id: number) => void;
  /** Ids that can't be picked (e.g. already guessed). */
  exclude?: ReadonlySet<number>;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  /** Show sprites next to suggestions. Off where a sprite would give the answer away. */
  showSprites?: boolean;
}

const NONE: ReadonlySet<number> = new Set();

/** Autocomplete that only ever yields a real Pokémon id. */
export default function PokemonInput({
  onSelect,
  exclude = NONE,
  disabled = false,
  placeholder,
  autoFocus = true,
  showSprites = true,
}: Props) {
  const { t } = useT();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const results = useMemo(() => searchPokemon(query, exclude), [query, exclude]);

  const choose = (id: number) => {
    onSelect(id);
    setQuery('');
    setActive(0);
    setOpen(false);
    setError(null);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const exact = findByInput(query);
      if (exact && exclude.has(exact.id)) setError(t('input.already', { name: exact.name }));
      else if (exact) choose(exact.id);
      else if (results[active]) choose(results[active].id);
      else if (query.trim()) setError(t('input.none'));
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showList = open && results.length > 0;

  return (
    <div className="relative w-full max-w-md">
      <input
        ref={inputRef}
        value={query}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
          setError(null);
        }}
        onKeyDown={onKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        placeholder={placeholder ?? t('input.placeholder')}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList ? `${listId}-${active}` : undefined}
        aria-label={t('input.label')}
        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-lg outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/30 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800"
      />
      {error && <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">{error}</p>}
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
        >
          {results.map((p, i) => (
            <li
              key={p.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown + preventDefault so the input doesn't blur before the click lands
              onMouseDown={(e) => {
                e.preventDefault();
                choose(p.id);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-2 px-2 ${showSprites ? 'py-0.5' : 'py-2'} ${
                i === active ? 'bg-red-50 dark:bg-slate-700' : ''
              }`}
            >
              {showSprites ? <Sprite id={p.id} scale={0.6} /> : <span className="w-1" aria-hidden />}
              <span className="font-medium">{p.name}</span>
              <span className="ml-auto pr-2 font-mono text-xs text-slate-400">#{p.id}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
