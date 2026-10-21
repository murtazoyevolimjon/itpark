import { describe, expect, it } from 'vitest';
import { escapeLike, findLoginConflict, validateCenterInput } from '../centerRules';

describe('validateCenterInput', () => {
  const ok = { name: 'Najot Ta\'lim', login: 'najot_admin', password: 'secret1', adminName: 'Ali', phone: '+998901234567' };

  it('accepts a valid center', () => {
    expect(validateCenterInput(ok)).toBeNull();
  });
  it('rejects blank name and too long name', () => {
    expect(validateCenterInput({ ...ok, name: '   ' })).toMatch(/nomi/);
    expect(validateCenterInput({ ...ok, name: 'a'.repeat(101) })).toMatch(/100/);
  });
  it('rejects short, long and spaced logins', () => {
    expect(validateCenterInput({ ...ok, login: 'ab' })).toMatch(/Login/);
    expect(validateCenterInput({ ...ok, login: 'a'.repeat(61) })).toMatch(/Login/);
    expect(validateCenterInput({ ...ok, login: 'my login' })).toMatch(/bo'sh joy/);
  });
  it('rejects short passwords', () => {
    expect(validateCenterInput({ ...ok, password: '12345' })).toMatch(/Parol/);
  });
  it('only validates the fields that are provided (partial edits)', () => {
    expect(validateCenterInput({ phone: '+998901234567' })).toBeNull();
    expect(validateCenterInput({})).toBeNull();
  });
});

describe('escapeLike', () => {
  it('neutralises LIKE wildcards so a login matches literally', () => {
    expect(escapeLike('a%b_c')).toBe('a\\%b\\_c');
    expect(escapeLike('%')).toBe('\\%');
    expect(escapeLike('plain')).toBe('plain');
  });
});

describe('findLoginConflict', () => {
  const fake = (db: { users?: any[]; centers?: any[]; teachers?: any[] }) => ({
    from: (table: 'users' | 'centers' | 'teachers') => {
      const rows = db[table] || [];
      const b: any = {
        select: () => b,
        ilike: () => b,
        limit: () => b,
        then: (res: any, rej: any) => Promise.resolve({ data: rows, error: null }).then(res, rej),
      };
      return b;
    },
  });

  it('is free when nothing matches', async () => {
    expect(await findLoginConflict(fake({}), 'new_login')).toBeNull();
  });
  it('detects a clash with an owner account', async () => {
    expect(await findLoginConflict(fake({ users: [{ id: 'u1', centerId: 'c1' }] }), 'x')).toMatch(/mavjud/);
  });
  it('detects a clash with a teacher login (it would shadow the account at sign-in)', async () => {
    expect(await findLoginConflict(fake({ teachers: [{ id: 't1' }] }), 'x')).toMatch(/o'qituvchi/);
  });
  it('ignores the center being edited', async () => {
    const db = { users: [{ id: 'u1', centerId: 'c1' }], centers: [{ id: 'c1' }] };
    expect(await findLoginConflict(fake(db), 'same', { centerId: 'c1' })).toBeNull();
    expect(await findLoginConflict(fake(db), 'same', { centerId: 'c2' })).not.toBeNull();
  });
});
