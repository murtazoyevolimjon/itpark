import { describe, expect, it } from 'vitest';
import { clampLimit, clampPage, fetchAll, safeSearch } from '../pagedFetch';

const table = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i }));
const source = (rows: any[]) => async (from: number, to: number) => ({
  data: rows.slice(from, to + 1),
  error: null,
});

describe('fetchAll', () => {
  it('reads past the 1000-row server cap', async () => {
    const rows = await fetchAll(source(table(2500)));
    expect(rows).toHaveLength(2500);
    expect(rows[2499]).toEqual({ id: 2499 });
  });
  it('handles an exact multiple of the page size and an empty table', async () => {
    expect(await fetchAll(source(table(2000)))).toHaveLength(2000);
    expect(await fetchAll(source([]))).toHaveLength(0);
  });
  it('throws when a page fails instead of returning partial data', async () => {
    await expect(fetchAll(async () => ({ data: null, error: { message: 'boom' } }))).rejects.toThrow('boom');
  });
});

describe('safeSearch', () => {
  it('removes characters that break an or() filter and escapes wildcards', () => {
    expect(safeSearch('a,b)c(d')).toBe('a b c d');
    expect(safeSearch('50%_x')).toBe('50\\%\\_x');
    expect(safeSearch(null)).toBe('');
  });
});

describe('clampLimit / clampPage', () => {
  it('bounds page size and page number', () => {
    expect(clampLimit('100000')).toBe(200);
    expect(clampLimit('-5')).toBe(10);
    expect(clampLimit('abc', 20)).toBe(20);
    expect(clampLimit('50')).toBe(50);
    expect(clampPage('0')).toBe(1);
    expect(clampPage('3')).toBe(3);
  });
});
