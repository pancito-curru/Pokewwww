import { byId } from '../../data';
import ShareButton from '../../components/ShareButton';
import Sprite from '../../components/Sprite';
import TypeBadge from '../../components/TypeBadge';
import { shareText } from '../../lib/compare';
import { useT } from '../../i18n';
import { useGuessStore, type GuessRound } from './store';

export default function ResultCard({ round }: { round: GuessRound }) {
  const { t } = useT();
  const stats = useGuessStore((s) => s.stats[round.mode]);
  const newUnlimited = useGuessStore((s) => s.newUnlimited);
  const target = byId.get(round.targetId)!;
  const won = round.status === 'won';
  const n = round.guesses.length;

  const text = () =>
    shareText({
      t,
      title: `Pokewwwww ${t('mode.guess.title')} ${round.mode === 'daily' ? round.key : t('common.unlimitedKey')}`,
      guesses: round.guesses.map((id) => byId.get(id)!),
      target,
      won,
      hintsUsed: round.hintsUsed.length,
    });

  const winPct = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;

  return (
    <section className="flex flex-col gap-5 rounded-xl bg-white p-5 shadow dark:bg-slate-800/60 sm:flex-row sm:items-center">
      <Sprite id={target.id} scale={2.5} className="animate-pop self-center" />
      <div className="flex-1">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {won ? t('gs.gotIt', { count: n }) : t('puz.itWas')}
        </p>
        <h2 className="mt-1 text-2xl font-bold">
          {target.name} <span className="font-mono text-base font-normal text-slate-400">#{target.id}</span>
        </h2>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          {target.types.map((ty) => (
            <TypeBadge key={ty} type={ty} />
          ))}
          <span>{target.genus}</span>
        </div>

        <dl className="mt-4 flex gap-5 text-center text-sm">
          {[
            [t('puz.played'), stats.played],
            [t('puz.winPct'), winPct],
            [t('puz.streak'), stats.streak],
            [t('puz.best'), stats.maxStreak],
          ].map(([label, v]) => (
            <div key={label}>
              <dd className="text-xl font-bold tabular-nums">{v}</dd>
              <dt className="text-xs text-slate-500">{label}</dt>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex flex-col gap-2 sm:w-44">
        <ShareButton text={text} />
        <button
          type="button"
          onClick={newUnlimited}
          className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white shadow hover:bg-red-700"
        >
          {round.mode === 'daily' ? t('puz.playUnlimited') : t('puz.new')}
        </button>
        {round.mode === 'daily' && <p className="text-center text-xs text-slate-500">{t('gs.tomorrow')}</p>}
      </div>
    </section>
  );
}
