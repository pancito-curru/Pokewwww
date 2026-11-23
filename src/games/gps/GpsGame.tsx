import { useMatch } from 'react-router-dom';
import { useT } from '../../i18n';
import { useLocationData } from './useLocationData';
import GpsPuzzle from './GpsPuzzle';
import GpsExplore from './GpsExplore';

/** `/gps` is the clue puzzle (daily + unlimited); `/gps/map` explores places one by one. */
export default function GpsGame() {
  const { t } = useT();
  const exploring = !!useMatch('/gps/map');
  // The location data (~170 kB) loads only when this game opens.
  const data = useLocationData();
  if (!data) return <p className="py-10 text-center text-sm text-slate-500">{t('gps.loading')}</p>;
  return exploring ? <GpsExplore data={data} /> : <GpsPuzzle data={data} />;
}
