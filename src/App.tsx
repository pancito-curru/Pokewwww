import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import { useT } from './i18n';

// Each game loads on demand; the home page only needs the shared data.
const TimedGame = lazy(() => import('./games/timed/TimedGame'));
const GuessGame = lazy(() => import('./games/guess/GuessGame'));
const WordleGame = lazy(() => import('./games/wordle/WordleGame'));
const CrosswordGame = lazy(() => import('./games/crossword/CrosswordGame'));
const SilhouetteGame = lazy(() => import('./games/identify/SilhouetteGame'));
const CryGame = lazy(() => import('./games/identify/CryGame'));
const MovesetGame = lazy(() => import('./games/moveset/MovesetGame'));
const HangmanGame = lazy(() => import('./games/hangman/HangmanGame'));
const ShinyGame = lazy(() => import('./games/shiny/ShinyGame'));
const GpsGame = lazy(() => import('./games/gps/GpsGame'));
const ItemGame = lazy(() => import('./games/items/ItemGame'));
const PokeIndexGame = lazy(() => import('./games/pokeindex/PokeIndexGame'));
const Contact = lazy(() => import('./pages/Contact'));

const Loading = () => {
  const { t } = useT();
  return <p className="py-10 text-center text-sm text-slate-500">{t('app.loading')}</p>;
};

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="timed" element={<Suspense fallback={<Loading />}><TimedGame /></Suspense>} />
        <Route path="guess" element={<Suspense fallback={<Loading />}><GuessGame /></Suspense>} />
        <Route path="wordle" element={<Suspense fallback={<Loading />}><WordleGame /></Suspense>} />
        <Route path="crossword" element={<Suspense fallback={<Loading />}><CrosswordGame /></Suspense>} />
        <Route path="silhouette" element={<Suspense fallback={<Loading />}><SilhouetteGame /></Suspense>} />
        <Route path="cry" element={<Suspense fallback={<Loading />}><CryGame /></Suspense>} />
        <Route path="moveset" element={<Suspense fallback={<Loading />}><MovesetGame /></Suspense>} />
        <Route path="hangman" element={<Suspense fallback={<Loading />}><HangmanGame /></Suspense>} />
        <Route path="shiny" element={<Suspense fallback={<Loading />}><ShinyGame /></Suspense>} />
        <Route path="gps" element={<Suspense fallback={<Loading />}><GpsGame /></Suspense>} />
        <Route path="gps/map" element={<Suspense fallback={<Loading />}><GpsGame /></Suspense>} />
        <Route path="item" element={<Suspense fallback={<Loading />}><ItemGame /></Suspense>} />
        <Route path="pokeindex" element={<Suspense fallback={<Loading />}><PokeIndexGame /></Suspense>} />
        <Route path="contact" element={<Suspense fallback={<Loading />}><Contact /></Suspense>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
