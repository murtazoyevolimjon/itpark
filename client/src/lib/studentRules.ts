import { escapeLike } from './centerRules';

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

  // One targeted query: the same person has the same name, so only those few rows are read and
  // the phone is compared in memory (phones are stored with spaces/signs, so they cannot be matched in SQL)
  const { data, error } = await supabase
    .from('students')
    .select('id, firstName, lastName, phone')
    .eq('centerId', centerId)
    .ilike('firstName', escapeLike(candidate.firstName.trim()))
    .ilike('lastName', escapeLike(candidate.lastName.trim()))
    .limit(50);
  if (error) return null;

  return (data || []).find((r: any) => samePerson(candidate, r)) || null;
}