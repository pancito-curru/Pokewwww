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

export const CONTACT_KINDS: Record<ContactKind, { label: string; hint: string; placeholder: string }> = {
  comment: {
    label: 'Comment',
    hint: 'Anything you want to tell us',
    placeholder: 'What do you think of Pokewwwww?',
  },
  bug: {
    label: 'Bug report',
    hint: 'Something broken or wrong',
    placeholder: 'What happened, and what did you expect? Steps to reproduce help a lot.',
  },
  feature: {
    label: 'Feature suggestion',
    hint: 'An idea to make it better',
    placeholder: 'What would you like to see?',
  },
};

export const CONTACT_AREAS = ['General', "Name 'Em All", "Who's That?", 'Pokédle', 'Pokécross'] as const;

export interface ContactForm {
  kind: ContactKind;
  area: string;
  message: string;
  name: string;
  email: string;
}

export const MAX_MESSAGE = 4000;

export function validateContact(f: ContactForm): Partial<Record<keyof ContactForm, string>> {
  const errors: Partial<Record<keyof ContactForm, string>> = {};
  const msg = f.message.trim();
  if (msg.length < 10) errors.message = 'Please write at least 10 characters.';
  else if (msg.length > MAX_MESSAGE) errors.message = `Please keep it under ${MAX_MESSAGE} characters.`;
  if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()))
    errors.email = 'That email address doesn’t look right.';
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
