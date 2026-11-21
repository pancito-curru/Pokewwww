import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CONTACT_AREAS,
  CONTACT_EMAIL,
  CONTACT_ENDPOINT,
  CONTACT_KINDS,
  MAX_MESSAGE,
  contactPayload,
  validateContact,
  type ContactForm,
  type ContactKind,
} from '../lib/contact';

type Status = 'idle' | 'sending' | 'sent' | 'error';

const field =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/30 dark:border-slate-600 dark:bg-slate-800';
const label = 'mb-1 block text-sm font-semibold';

export default function Contact() {
  const [params] = useSearchParams();
  const initialKind = (Object.keys(CONTACT_KINDS) as ContactKind[]).find((k) => k === params.get('type')) ?? 'comment';
  const empty: ContactForm = { kind: initialKind, area: 'General', message: '', name: '', email: '' };

  const [form, setForm] = useState<ContactForm>(empty);
  const [errors, setErrors] = useState<ReturnType<typeof validateContact>>({});
  const [status, setStatus] = useState<Status>('idle');
  const [honey, setHoney] = useState('');

  // Follow footer links ("Report a bug") even when already on this page.
  useEffect(() => {
    setForm((f) => (f.kind === initialKind ? f : { ...f, kind: initialKind }));
  }, [initialKind]);

  const set = <K extends keyof ContactForm>(k: K, v: ContactForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateContact(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    // Bots fill the hidden field; pretend it worked and send nothing.
    if (honey) return setStatus('sent');
    setStatus('sending');
    try {
      const res = await fetch(CONTACT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(contactPayload(form, { userAgent: navigator.userAgent })),
      });
      const data = await res.json().catch(() => ({}));
      setStatus(res.ok && data.success !== 'false' && data.success !== false ? 'sent' : 'error');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'sent')
    return (
      <section className="mx-auto max-w-xl rounded-xl bg-white p-8 text-center shadow dark:bg-slate-800/60">
        <p className="text-4xl" aria-hidden>
          📬
        </p>
        <h1 className="mt-3 font-pixel text-lg">Thanks!</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          Your message was sent.{form.email ? ' We’ll reply to the address you gave if needed.' : ''}
        </p>
        <button
          type="button"
          onClick={() => {
            setForm({ ...empty, kind: form.kind });
            setStatus('idle');
          }}
          className="mt-6 rounded-lg border border-slate-300 px-4 py-2 font-semibold hover:border-slate-400 dark:border-slate-600"
        >
          Send another message
        </button>
      </section>
    );

  const kindInfo = CONTACT_KINDS[form.kind];

  return (
    <section className="mx-auto max-w-xl rounded-xl bg-white p-6 shadow dark:bg-slate-800/60">
      <h1 className="font-pixel text-xl">Contact</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        Found a bug, have an idea, or just want to say hi? Send a message.
      </p>

      <form onSubmit={submit} noValidate className="mt-6 space-y-5">
        <fieldset>
          <legend className={label}>What is it about?</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(CONTACT_KINDS) as ContactKind[]).map((k) => (
              <label
                key={k}
                className={`cursor-pointer rounded-lg border px-3 py-2 text-sm transition ${
                  form.kind === k
                    ? 'border-red-600 bg-red-50 dark:bg-red-950/40'
                    : 'border-slate-300 hover:border-slate-400 dark:border-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="kind"
                  value={k}
                  checked={form.kind === k}
                  onChange={() => set('kind', k)}
                  aria-label={CONTACT_KINDS[k].label}
                  className="sr-only"
                />
                <span className="block font-semibold">{CONTACT_KINDS[k].label}</span>
                <span className="block text-xs text-slate-500">{CONTACT_KINDS[k].hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="contact-area" className={label}>
            Which part of the site?
          </label>
          <select id="contact-area" className={field} value={form.area} onChange={(e) => set('area', e.target.value)}>
            {CONTACT_AREAS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="contact-message" className={label}>
            Message
          </label>
          <textarea
            id="contact-message"
            rows={6}
            maxLength={MAX_MESSAGE + 200}
            className={field}
            placeholder={kindInfo.placeholder}
            value={form.message}
            onChange={(e) => set('message', e.target.value)}
            aria-invalid={!!errors.message}
            aria-describedby={errors.message ? 'contact-message-error' : undefined}
          />
          <div className="mt-1 flex justify-between text-xs">
            <span id="contact-message-error" className="text-rose-600 dark:text-rose-400">
              {errors.message}
            </span>
            <span className="tabular-nums text-slate-400">
              {form.message.trim().length}/{MAX_MESSAGE}
            </span>
          </div>
          {form.kind === 'bug' && (
            <p className="mt-1 text-xs text-slate-500">Your browser version is attached to bug reports to help track it down.</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="contact-name" className={label}>
              Name <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="contact-name"
              className={field}
              autoComplete="name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="contact-email" className={label}>
              Email <span className="font-normal text-slate-400">(optional, for a reply)</span>
            </label>
            <input
              id="contact-email"
              type="email"
              className={field}
              autoComplete="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'contact-email-error' : undefined}
            />
            <p id="contact-email-error" className="mt-1 text-xs text-rose-600 dark:text-rose-400">
              {errors.email}
            </p>
          </div>
        </div>

        {/* Spam trap: hidden from people, filled in by bots. */}
        <input
          type="text"
          name="_honey"
          tabIndex={-1}
          autoComplete="off"
          value={honey}
          onChange={(e) => setHoney(e.target.value)}
          className="hidden"
          aria-hidden
        />

        {status === 'error' && (
          <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            The message couldn&apos;t be sent. Please try again in a moment, or email{' '}
            <a className="font-semibold underline" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 dark:border-slate-700">
          <p className="text-xs text-slate-500">Messages are delivered by email through FormSubmit.</p>
          <button
            type="submit"
            disabled={status === 'sending'}
            className="rounded-lg bg-red-600 px-6 py-2.5 font-semibold text-white shadow hover:bg-red-700 disabled:opacity-60"
          >
            {status === 'sending' ? 'Sending…' : 'Send message'}
          </button>
        </div>
      </form>
    </section>
  );
}
