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
    { id: '2', firstName: 'Ali', lastName: 'Valiyev', phone: '+998909999999' },
  ];
  // Returns whatever the name query would return: same name, different phones
  const fakeDb = (result: { data: any[] | null; error: any }) => {
    const calls: string[] = [];
    const b: any = {
      select: () => b,
      eq: () => b,
      ilike: (col: string, val: string) => {
        calls.push(`${col}=${val}`);
        return b;
      },
      limit: () => Promise.resolve(result),
    };
    return { db: { from: () => b }, calls };
  };

  it('finds the person among same-named students by phone, with one name query', async () => {
    const { db, calls } = fakeDb({ data: rows, error: null });
    const found = await findSamePerson(db, 'c1', { firstName: 'Ali', lastName: 'Valiyev', phone: '+998 90 999 99 99' });
    expect(found?.id).toBe('2');
    expect(calls).toEqual(['firstName=Ali', 'lastName=Valiyev']);
  });
  it('escapes wildcard characters in the name', async () => {
    const { db, calls } = fakeDb({ data: [], error: null });
    await findSamePerson(db, 'c1', { firstName: '50%', lastName: 'a_b', phone: '901234567' });
    expect(calls).toEqual(['firstName=50\\%', 'lastName=a\\_b']);
  });
  it('returns null for a new person, a short phone or a failed query', async () => {
    expect(await findSamePerson(fakeDb({ data: rows, error: null }).db, 'c1', { firstName: 'Ali', lastName: 'Valiyev', phone: '901111111' })).toBeNull();
    expect(await findSamePerson(fakeDb({ data: rows, error: null }).db, 'c1', { firstName: 'Ali', lastName: 'Valiyev', phone: '12' })).toBeNull();
    expect(await findSamePerson(fakeDb({ data: null, error: { message: 'x' } }).db, 'c1', { firstName: 'Ali', lastName: 'Valiyev', phone: '901234567' })).toBeNull();
  });
});