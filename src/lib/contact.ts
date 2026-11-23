/**
 * Contact form delivery via FormSubmit (https://formsubmit.co): a static site has no
 * server of its own, so the form posts to FormSubmit, which emails the message on.
 *
 * One-time setup: the first submission makes FormSubmit email CONTACT_EMAIL an
 * activation link. Messages are delivered after that link is clicked.
 * To keep the address out of the page source, replace CONTACT_EMAIL in the endpoint
 * with the random alias FormSubmit shows after activation.
 */
export const CONTACT_EMAIL = 'blnbrlab@gmail.com';
export const CONTACT_ENDPOINT = `https://formsubmit.co/ajax/${CONTACT_EMAIL}`;

export type ContactKind = 'comment' | 'bug' | 'feature';

/** The label goes into the email subject, so it stays in English whatever the page language. */
export const CONTACT_KINDS: Record<ContactKind, { label: string }> = {
  comment: { label: 'Comment' },
  bug: { label: 'Bug report' },
  feature: { label: 'Feature suggestion' },
};

/** `value` is what the email says (English); `key` is the dictionary entry the form shows. */
export const CONTACT_AREAS = [
  { value: 'General', key: 'ct.area.general' },
  { value: "Name 'Em All", key: 'mode.timed.title' },
  { value: "Who's That?", key: 'mode.guess.title' },
  { value: 'Pokédle', key: 'mode.wordle.title' },
  { value: 'Pokécross', key: 'mode.crossword.title' },
  { value: 'Silhouettes', key: 'mode.silhouette.title' },
  { value: 'Cries', key: 'mode.cry.title' },
  { value: 'Moveset', key: 'mode.moveset.title' },
  { value: 'Hangman', key: 'mode.hangman.title' },
  { value: 'PokeIndex', key: 'mode.pokeindex.title' },
  { value: 'Shiny Hunt', key: 'mode.shiny.title' },
  { value: 'PokeGPS', key: 'mode.gps.title' },
  { value: 'Item Sprites', key: 'mode.item.title' },
] as const;

export interface ContactForm {
  kind: ContactKind;
  area: string;
  message: string;
  name: string;
  email: string;
}

export const MAX_MESSAGE = 4000;

/** Error codes; the form turns them into text in the current language. */
export type ContactError = 'short' | 'long' | 'email';

export function validateContact(f: ContactForm): Partial<Record<keyof ContactForm, ContactError>> {
  const errors: Partial<Record<keyof ContactForm, ContactError>> = {};
  const msg = f.message.trim();
  if (msg.length < 10) errors.message = 'short';
  else if (msg.length > MAX_MESSAGE) errors.message = 'long';
  if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) errors.email = 'email';
  return errors;
}

/** Fields FormSubmit understands; `_`-prefixed ones configure the email it sends. */
export function contactPayload(f: ContactForm, context: { userAgent: string }) {
  const kind = CONTACT_KINDS[f.kind].label;
  return {
    _subject: `Pokewwwww · ${kind}${f.area !== 'General' ? ` · ${f.area}` : ''}`,
    _template: 'table',
    _captcha: 'false',
    ...(f.email.trim() && { _replyto: f.email.trim() }),
    Type: kind,
    Area: f.area,
    Message: f.message.trim(),
    Name: f.name.trim() || '(not given)',
    Email: f.email.trim() || '(not given)',
    ...(f.kind === 'bug' && { Browser: context.userAgent }),
  };
}
