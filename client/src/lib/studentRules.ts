import { fetchAll } from './pagedFetch';

export const normalizeName = (value: string | null | undefined): string =>
  (value || '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Last 9 digits: the same number written as +998 90 123 45 67 or 901234567 matches. */
export const phoneKey = (value: string | null | undefined): string => {
  const digits = (value || '').replace(/\D/g, '');
  return digits.slice(-9);
};

export const samePerson = (
  a: { firstName?: string | null; lastName?: string | null; phone?: string | null },
  b: { firstName?: string | null; lastName?: string | null; phone?: string | null }
): boolean => {
  const keyA = phoneKey(a.phone);
  if (keyA.length < 9 || keyA !== phoneKey(b.phone)) return false;
  return (
    normalizeName(a.firstName) === normalizeName(b.firstName) &&
    normalizeName(a.lastName) === normalizeName(b.lastName)
  );
};

/**
 * One student attends several subjects through several groups, so the same person (same phone AND same name)
 * must not be created twice. Brothers/sisters sharing a phone have different names and stay allowed.
 */
export async function findSamePerson(
  supabase: any,
  centerId: string,
  candidate: { firstName: string; lastName: string; phone: string }
): Promise<{ id: string; firstName: string; lastName: string } | null> {
  const key = phoneKey(candidate.phone);
  if (key.length < 9) return null;

  // Fast path: the generated `phoneKey` column (exists once the unique-constraints migration ran)
  let rows: any[] | null = null;
  const fast = await supabase
    .from('students')
    .select('id, firstName, lastName, phone')
    .eq('centerId', centerId)
    .eq('phoneKey', key)
    .limit(50);
  if (!fast.error) rows = fast.data || [];

  if (rows === null) {
    rows = await fetchAll<any>((from, to) =>
      supabase
        .from('students')
        .select('id, firstName, lastName, phone')
        .eq('centerId', centerId)
        .order('id')
        .range(from, to)
    );
  }

  return rows.find((r) => samePerson(candidate, r)) || null;
}
