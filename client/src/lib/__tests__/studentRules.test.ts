import { describe, expect, it } from 'vitest';
import { findSamePerson, phoneKey, samePerson } from '../studentRules';

describe('samePerson', () => {
  const ali = { firstName: 'Ali', lastName: 'Valiyev', phone: '+998 90 123 45 67' };
  it('matches the same name and number however they are written', () => {
    expect(samePerson(ali, { firstName: ' ali ', lastName: 'VALIYEV', phone: '901234567' })).toBe(true);
  });
  it('does not match a sibling sharing the phone, or a namesake with another phone', () => {
    expect(samePerson(ali, { firstName: 'Vali', lastName: 'Valiyev', phone: '901234567' })).toBe(false);
    expect(samePerson(ali, { firstName: 'Ali', lastName: 'Valiyev', phone: '901234568' })).toBe(false);
  });
  it('never matches on a too-short phone', () => {
    expect(samePerson({ ...ali, phone: '123' }, { ...ali, phone: '123' })).toBe(false);
    expect(phoneKey('+998 (90) 123-45-67')).toBe('901234567');
  });
});

describe('findSamePerson', () => {
  const rows = [
    { id: '1', firstName: 'Ali', lastName: 'Valiyev', phone: '+998901234567' },
    { id: '2', firstName: 'Vali', lastName: 'Valiyev', phone: '+998901234567' },
  ];
  const fakeDb = (failFast: boolean) => ({
    from: () => {
      const b: any = {
        select: () => b,
        eq: () => b,
        order: () => b,
        limit: () => b,
        range: (from: number, to: number) =>
          Promise.resolve({ data: failFast ? rows.slice(from, to + 1) : rows, error: null }),
        then: (res: any, rej: any) =>
          Promise.resolve(failFast ? { data: null, error: { message: 'no column phoneKey' } } : { data: rows, error: null }).then(res, rej),
      };
      return b;
    },
  });

  it('finds the existing person through the fast path', async () => {
    const found = await findSamePerson(fakeDb(false), 'c1', { firstName: 'Ali', lastName: 'Valiyev', phone: '901234567' });
    expect(found?.id).toBe('1');
  });
  it('falls back to a full scan when the phoneKey column does not exist yet', async () => {
    const found = await findSamePerson(fakeDb(true), 'c1', { firstName: 'Vali', lastName: 'Valiyev', phone: '901234567' });
    expect(found?.id).toBe('2');
  });
  it('returns null for a new person', async () => {
    const found = await findSamePerson(fakeDb(false), 'c1', { firstName: 'Soli', lastName: 'Valiyev', phone: '901234567' });
    expect(found).toBeNull();
  });
});
