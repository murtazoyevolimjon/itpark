/**
 * Supabase/PostgREST silently caps every response at 1000 rows. Any report that sums or counts over a
 * whole table must read it page by page, otherwise a big center gets wrong totals without any error.
 */

const PAGE_SIZE = 1000;
const MAX_ROWS = 500_000;

type PageResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

/**
 * `build(from, to)` must return a query that is ordered by a unique column (e.g. `.order('id')`),
 * otherwise rows can repeat or be skipped between pages.
 */
export async function fetchAll<T = any>(build: (from: number, to: number) => PageResult<T>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    const { data, error } = await build(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const page = data || [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

/** Keeps characters that would break a PostgREST `.or()` filter (commas, parentheses) out of user search text. */
export function safeSearch(raw: string | null | undefined): string {
  return (raw || '')
    .replace(/[,()\\"]/g, ' ')
    .replace(/[%_]/g, (m) => `\\${m}`)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

/** Page size from a query string: a number between 1 and `max`, so one request can never pull a whole table. */
export function clampLimit(raw: string | null, fallback = 10, max = 200): number {
  const n = parseInt(raw || '', 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

export function clampPage(raw: string | null): number {
  const n = parseInt(raw || '', 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}
