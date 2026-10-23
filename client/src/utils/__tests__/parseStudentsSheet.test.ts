import { describe, expect, it } from 'vitest';
import { parseStudentsSheet } from '../parseStudentsSheet';
import { isValidUzPhone, localPhoneDigits, normalizeUzPhone } from '../uzPhone';

describe('normalizeUzPhone', () => {
  it('adds +998 to local numbers typed in any shape', () => {
    expect(normalizeUzPhone('88-579-03-09')).toBe('998885790309');
    expect(normalizeUzPhone('90 123 45 67')).toBe('998901234567');
    expect(normalizeUzPhone('0901234567')).toBe('998901234567');
    expect(normalizeUzPhone(901234567)).toBe('998901234567');
  });

  it('keeps numbers that already have the prefix', () => {
    expect(normalizeUzPhone('+998 90 123 45 67')).toBe('998901234567');
    expect(normalizeUzPhone('998901234567')).toBe('998901234567');
    expect(normalizeUzPhone('00998901234567')).toBe('998901234567');
  });

  it('returns an empty string for nothing and digits for odd input', () => {
    expect(normalizeUzPhone('')).toBe('');
    expect(normalizeUzPhone(null)).toBe('');
    expect(isValidUzPhone(normalizeUzPhone('12345'))).toBe(false);
  });

  it('extracts the typed part after the prefix', () => {
    expect(localPhoneDigits('998901234567')).toBe('901234567');
    expect(localPhoneDigits('99890')).toBe('90');
  });
});

describe('parseStudentsSheet', () => {
  it('reads a list with Ism / Familiya / Telefon / parent headers', () => {
    const { rows } = parseStudentsSheet([
      ['№', 'Ism', 'Familiya', 'Telefon', "Ota-onasining telefoni"],
      [1, 'Ali', 'Valiyev', '90 123 45 67', '88-579-03-09'],
      [2, 'Vali', 'Aliyev', '901234568', ''],
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ firstName: 'Ali', lastName: 'Valiyev', phone: '998901234567', parentPhone: '998885790309', problem: null });
    expect(rows[1].parentPhone).toBe('');
    expect(rows[1].problem).toBeNull();
  });

  it('splits one F.I.Sh column as Familiya Ism and can swap it', () => {
    const sheet = [['F.I.Sh', 'Tel'], ['Valiyev Ali', '901234567']];
    expect(parseStudentsSheet(sheet).rows[0]).toMatchObject({ lastName: 'Valiyev', firstName: 'Ali' });
    expect(parseStudentsSheet(sheet, { swapNames: true }).rows[0]).toMatchObject({ lastName: 'Ali', firstName: 'Valiyev' });
  });

  it('guesses the columns of a list without a header', () => {
    const { rows } = parseStudentsSheet([
      ['Ali', 'Valiyev', '90 123 45 67'],
      ['Vali', 'Aliyev', '91 234 56 78'],
    ]);
    expect(rows[0]).toMatchObject({ firstName: 'Ali', lastName: 'Valiyev', phone: '998901234567', problem: null });
    expect(rows).toHaveLength(2);
  });

  it('flags rows with a bad phone or a missing name, and takes the first of two phones', () => {
    const { rows } = parseStudentsSheet([
      ['Ism', 'Familiya', 'Telefon'],
      ['Ali', 'Valiyev', '12345'],
      ['', 'Aliyev', '901234567'],
      ['Sami', 'Karimov', '90 123 45 67, 91 111 22 33'],
    ]);
    expect(rows[0].problem).toBe('phone');
    expect(rows[1].problem).toBe('name');
    expect(rows[2]).toMatchObject({ phone: '998901234567', problem: null });
  });
});
