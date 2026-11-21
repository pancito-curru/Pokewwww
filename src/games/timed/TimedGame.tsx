import { useTimedStore } from './store';
import Setup from './Setup';
import Play from './Play';
import Results from './Results';

export default function TimedGame() {
  const status = useTimedStore((s) => s.game.status);
  if (status === 'playing') return <Play />;
  if (status === 'ended') return <Results />;
  return <Setup />;
}
