import { describe, expect, it } from 'vitest';
import { getArchivableMonthRange } from '../attendanceRetention';

describe('getArchivableMonthRange', () => {
  it('rejects malformed months', () => {
    expect(getArchivableMonthRange('')).toBeNull();
    expect(getArchivableMonthRange('2026-13')).toBeNull();
    expect(getArchivableMonthRange('2026-1')).toBeNull();
    expect(getArchivableMonthRange("2026-01'; drop")).toBeNull();
  });

  it('never allows the current or previous month to be archived', () => {
    const now = new Date();
    const key = (offset: number) => {
      const d = new Date(Date.UTC(now.getFullYear(), now.getMonth() + offset, 1));
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    };
    expect(getArchivableMonthRange(key(0))).toBeNull();
    expect(getArchivableMonthRange(key(-1))).toBeNull();
    expect(getArchivableMonthRange(key(-2))).not.toBeNull();
  });

  it('returns a half-open month range', () => {
    expect(getArchivableMonthRange('2020-02')).toEqual({
      start: '2020-02-01T00:00:00.000Z',
      end: '2020-03-01T00:00:00.000Z',
    });
  });
});
