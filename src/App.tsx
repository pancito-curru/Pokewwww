import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';

// Each game loads on demand; the home page only needs the shared data.
const TimedGame = lazy(() => import('./games/timed/TimedGame'));
const GuessGame = lazy(() => import('./games/guess/GuessGame'));
const WordleGame = lazy(() => import('./games/wordle/WordleGame'));
const CrosswordGame = lazy(() => import('./games/crossword/CrosswordGame'));
const SilhouetteGame = lazy(() => import('./games/identify/SilhouetteGame'));
const CryGame = lazy(() => import('./games/identify/CryGame'));
const Contact = lazy(() => import('./pages/Contact'));

const Loading = () => <p className="py-10 text-center text-sm text-slate-500">Loading…</p>;

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
        <Route path="contact" element={<Suspense fallback={<Loading />}><Contact /></Suspense>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
