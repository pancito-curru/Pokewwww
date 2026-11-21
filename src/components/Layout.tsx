import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { MODES } from '../games/modes';

export default function Layout() {
  const { pathname } = useLocation();

  useEffect(() => {
    const mode = MODES.find((m) => m.path === pathname);
    document.title = mode ? `${mode.title} · Pokewwww` : 'Pokewwww · Pokémon Trivia';
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-5">
        <Link to="/" className="font-pixel text-lg tracking-tight text-red-600 dark:text-red-400">
          Pokewwww
        </Link>
        <nav aria-label="Game modes" className="-mx-1 flex flex-wrap gap-1 text-sm">
          {MODES.map((m) => (
            <NavLink
              key={m.path}
              to={m.path}
              className={({ isActive }) =>
                `rounded-md px-2.5 py-1 font-medium transition ${
                  isActive
                    ? 'bg-red-600 text-white'
                    : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800'
                }`
              }
            >
              {m.title}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1 pb-10">
        <Outlet />
      </main>
      <footer className="space-y-2 border-t border-slate-300 py-4 text-center text-xs text-slate-500 dark:border-slate-700">
        <p>
          Pokewwww is a non-profit fan project. If you&apos;d like to support it or help out, you can do so on{' '}
          <a
            className="inline-flex items-center gap-1 font-semibold text-red-600 underline hover:text-red-700 dark:text-red-400"
            href="https://ko-fi.com/pancitocurru"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span aria-hidden>☕</span> Ko-fi
          </a>
          .
        </p>
        <p>
          Pokémon © Nintendo / Game Freak / The Pokémon Company. Data:{' '}
          <a className="underline" href="https://pokeapi.co">PokeAPI</a>. Sprites:{' '}
          <a className="underline" href="https://github.com/msikma/pokesprite">PokéSprite</a>.
        </p>
      </footer>
    </div>
  );
}
