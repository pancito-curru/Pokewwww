import { useLang } from '../i18n';
import { LANGS, type Lang } from '../lib/i18n';
import { useT } from '../i18n';

const LABEL: Record<Lang, string> = { en: 'EN', es: 'ES' };
const NAME: Record<Lang, string> = { en: 'English', es: 'Español' };

/** Language toggle; the choice is remembered in localStorage. */
export default function LangSwitch() {
  const { lang, setLang } = useLang();
  const { t } = useT();
  return (
    <div role="group" aria-label={t('lang.label')} className="flex rounded-md border border-slate-300 p-0.5 text-xs dark:border-slate-600">
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          title={NAME[l]}
          aria-label={NAME[l]}
          aria-pressed={lang === l}
          onClick={() => setLang(l)}
          className={`rounded px-2 py-0.5 font-semibold transition ${
            lang === l ? 'bg-red-600 text-white' : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          {LABEL[l]}
        </button>
      ))}
    </div>
  );
}
