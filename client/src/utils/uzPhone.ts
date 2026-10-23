/**
 * Uzbek phone numbers are stored as 998XXXXXXXXX. People type them in many shapes:
 * "90 123 45 67", "88-579-03-09", "0901234567", "+998 90 123 45 67", a bare number from Excel.
 * Anything that is clearly a local number gets the +998 prefix; anything else is returned as plain digits.
 */
export function normalizeUzPhone(raw: unknown): string {
  let d = String(raw ?? '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 12 && d.startsWith('998')) return d;
  if (d.length === 9) return `998${d}`;
  if (d.length === 10 && d.startsWith('0')) return `998${d.slice(1)}`;
  return d;
}

export function isValidUzPhone(value: string): boolean {
  return /^998\d{9}$/.test(value);
}

/** The 9 digits after +998 (what a person types after the fixed prefix). */
export function localPhoneDigits(value: unknown): string {
  let d = String(value ?? '').replace(/\D/g, '');
  if (d.startsWith('998')) d = d.slice(3);
  return d.slice(0, 9);
}

/** "90 123 45 67" */
export function groupLocalPhone(local: string): string {
  return [local.slice(0, 2), local.slice(2, 5), local.slice(5, 7), local.slice(7, 9)].filter(Boolean).join(' ');
}
