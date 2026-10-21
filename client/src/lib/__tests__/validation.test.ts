import { describe, expect, it } from 'vitest';
import { date, firstError, money, numberValue, oneOf, phone, phoneDigits, text } from '../validation';

describe('text', () => {
  it('requires non-blank strings', () => {
    expect(text('', 'Nom')).toMatch(/shart/);
    expect(text('   ', 'Nom')).toMatch(/shart/);
    expect(text(undefined, 'Nom')).toMatch(/shart/);
    expect(text(123, 'Nom')).toMatch(/shart/);
    expect(text('ok', 'Nom')).toBeNull();
  });
  it('enforces max length', () => {
    expect(text('a'.repeat(101), 'Nom', 100)).toMatch(/100/);
  });
});

describe('numberValue / money', () => {
  it('rejects NaN, empty and out of range', () => {
    expect(numberValue('abc', 'Narx')).not.toBeNull();
    expect(numberValue('', 'Narx')).not.toBeNull();
    expect(numberValue(null, 'Narx')).not.toBeNull();
    expect(numberValue(-1, 'Narx', { min: 0 })).not.toBeNull();
    expect(numberValue(1.5, 'Qavat', { integer: true })).not.toBeNull();
  });
  it('accepts valid numbers incl. numeric strings with spaces', () => {
    expect(numberValue('500000', 'Narx', { min: 0 })).toBeNull();
    expect(numberValue('500 000', 'Narx', { min: 0 })).toBeNull();
    expect(numberValue(0, 'Narx', { min: 0 })).toBeNull();
  });
  it('money must be positive and sane', () => {
    expect(money(0)).not.toBeNull();
    expect(money(-5)).not.toBeNull();
    expect(money('x')).not.toBeNull();
    expect(money(1e15)).not.toBeNull();
    expect(money(600000)).toBeNull();
  });
});

describe('phone', () => {
  it('extracts digits', () => {
    expect(phoneDigits('+998 93 122 14 44')).toBe('998931221444');
    expect(phoneDigits(undefined)).toBe('');
  });
  it('validates length', () => {
    expect(phone('123')).not.toBeNull();
    expect(phone('')).not.toBeNull();
    expect(phone('', 'Tel', false)).toBeNull();
    expect(phone('+998 93 122 14 44')).toBeNull();
    expect(phone('931221444')).toBeNull();
  });
});

describe('date', () => {
  it('validates dates', () => {
    expect(date('nope', 'Sana')).not.toBeNull();
    expect(date('', 'Sana')).not.toBeNull();
    expect(date('', 'Sana', { required: false })).toBeNull();
    expect(date('2020-05-01', 'Sana')).toBeNull();
  });
  it('can forbid the future', () => {
    expect(date('2999-01-01', 'Sana', { notFuture: true })).not.toBeNull();
    expect(date(new Date().toISOString(), 'Sana', { notFuture: true })).toBeNull();
  });
});

describe('oneOf / firstError', () => {
  it('checks enums', () => {
    expect(oneOf('FAOL', ['FAOL', 'NOFAOL'], 'Holat')).toBeNull();
    expect(oneOf('x', ['FAOL', 'NOFAOL'], 'Holat')).not.toBeNull();
    expect(oneOf(undefined, ['FAOL'], 'Holat')).not.toBeNull();
  });
  it('returns the first error only', () => {
    expect(firstError(null, undefined, 'a', 'b')).toBe('a');
    expect(firstError(null, undefined)).toBeNull();
  });
});
