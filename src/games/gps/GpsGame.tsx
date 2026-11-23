import { useT } from '../../i18n';
import { PuzzleHeader } from '../puzzle/Chrome';
import GpsDaily from './GpsDaily';
import GpsUnlimited from './GpsUnlimited';
import { useGpsStore } from './store';
import { useLocationData } from './useLocationData';

/** PokeGPS: name every Pokémon that appears in a place. Daily = one place for everyone; unlimited = pick a region. */
export default function GpsGame() {
  const { t } = useT();
  const mode = useGpsStore((s) => s.mode);
  // The location data (~170 kB) loads only when this game opens.
  const data = useLocationData();

  return (
    <div className="space-y-5">
      <PuzzleHeader
        title={t('mode.gps.title')}
        intro={t(mode === 'daily' ? 'gps.introDaily' : 'gps.introUnlimited')}
        mode={mode}
        onMode={(m) => useGpsStore.getState().setMode(m)}
      />
      {!data ? (
        <p className="py-10 text-center text-sm text-slate-500">{t('gps.loading')}</p>
      ) : mode === 'daily' ? (
        <GpsDaily data={data} />
      ) : (
        <GpsUnlimited data={data} />
      )}
    </div>
  );
}
