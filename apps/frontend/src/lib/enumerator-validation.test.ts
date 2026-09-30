import { describe, expect, it } from 'vitest';
import { validateEnumerator } from './enumerator-validation';

const ok = { fullName: 'Amina Yusuf', email: '', phone: '+234 803 000 0000', state: 'Kano' };

describe('enumerator form', () => {
  it('accepts a complete form, with or without an email', () => {
    expect(validateEnumerator(ok)).toEqual({});
    expect(validateEnumerator({ ...ok, email: 'amina@example.org' })).toEqual({});
  });

  it('names: required, letters only, allows apostrophes, hyphens and other scripts', () => {
    expect(validateEnumerator({ ...ok, fullName: '  ' }).fullName).toMatch(/full name/i);
    expect(validateEnumerator({ ...ok, fullName: 'Amina 2' }).fullName).toMatch(/letters/i);
    for (const n of ["Nkechi O'Brien-Eze", 'Ibrahim Ɗanjuma', 'أمينة يوسف']) expect(validateEnumerator({ ...ok, fullName: n }).fullName).toBeUndefined();
  });

  it('email: optional, but must be valid when given', () => {
    expect(validateEnumerator({ ...ok, email: 'amina@' }).email).toMatch(/valid email/i);
    expect(validateEnumerator({ ...ok, email: 'a b@example.org' }).email).toBeDefined();
  });

  it('phone: required and plausible', () => {
    expect(validateEnumerator({ ...ok, phone: '' }).phone).toMatch(/enter a phone/i);
    expect(validateEnumerator({ ...ok, phone: '0803-abc' }).phone).toMatch(/valid phone/i);
    expect(validateEnumerator({ ...ok, phone: '12345' }).phone).toBeDefined();
    expect(validateEnumerator({ ...ok, phone: '08030000000' }).phone).toBeUndefined();
  });

  it('state: required', () => {
    expect(validateEnumerator({ ...ok, state: '' }).state).toBeDefined();
  });

  it('reports every problem at once', () => {
    expect(Object.keys(validateEnumerator({ fullName: '', email: 'x', phone: '', state: '' })).sort()).toEqual(['email', 'fullName', 'phone', 'state']);
  });
});
