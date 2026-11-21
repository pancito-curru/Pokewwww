import { describe, expect, it } from 'vitest';
import { contactPayload, validateContact, type ContactForm } from './contact';

const base: ContactForm = { kind: 'comment', area: 'General', message: 'Love the crossword mode!', name: '', email: '' };
const ctx = { userAgent: 'TestBrowser/1.0' };

describe('validateContact', () => {
  it('accepts a minimal message', () => expect(validateContact(base)).toEqual({}));
  it('requires a real message', () => expect(validateContact({ ...base, message: '  hi  ' }).message).toBeTruthy());
  it('rejects overly long messages', () =>
    expect(validateContact({ ...base, message: 'x'.repeat(4001) }).message).toBeTruthy());
  it('checks the email only when given', () => {
    expect(validateContact({ ...base, email: 'nope' }).email).toBeTruthy();
    expect(validateContact({ ...base, email: 'ash@example.com' })).toEqual({});
  });
});

describe('contactPayload', () => {
  it('builds a subject from type and area', () => {
    expect(contactPayload({ ...base, kind: 'feature', area: 'Pokédle' }, ctx)._subject).toBe(
      'Pokewwwww · Feature suggestion · Pokédle',
    );
    expect(contactPayload(base, ctx)._subject).toBe('Pokewwwww · Comment');
  });
  it('sets reply-to only when an email is given', () => {
    expect(contactPayload(base, ctx)).not.toHaveProperty('_replyto');
    expect(contactPayload({ ...base, email: ' ash@example.com ' }, ctx)._replyto).toBe('ash@example.com');
  });
  it('adds the browser to bug reports only', () => {
    expect(contactPayload({ ...base, kind: 'bug' }, ctx)).toMatchObject({ Browser: ctx.userAgent });
    expect(contactPayload(base, ctx)).not.toHaveProperty('Browser');
  });
});
