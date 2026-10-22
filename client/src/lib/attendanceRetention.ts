/**
 * Attendance Retention Policy Utility
 *
 * Rule:
 * The database keeps the current month and the previous calendar month as working data.
 * Older months are never deleted automatically: the center downloads them as Excel and PDF
 * (Attendance page, "Old attendance archive") and only then are they deleted from the database.
 *
 * Example:
 * In October 2026:
 * - Working data: September and October 2026
 * - Cutoff: 2026-09-01T00:00:00.000Z
 * - August 2026 and older wait in the archive until they are downloaded
 */

/**
 * Returns the retention cutoff ISO string (00:00:00.000Z of the 1st day of previous month).
 */
export function getAttendanceRetentionCutoff(): string {
  const now = new Date();
  const cutoff = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0));
  return cutoff.toISOString();
}

/**
 * Returns the minimum allowed date in YYYY-MM-DD format for date inputs (1st day of previous month).
 */
export function getAttendanceRetentionMinDateStr(): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

/**
 * Start and end (exclusive) of a "YYYY-MM" month, or null when the month is malformed or still inside
 * the working window (only months that ended before the cutoff may be archived and deleted).
 */
export function getArchivableMonthRange(month: string): { start: string; end: string } | null {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!m) return null;
  const year = Number(m[1]);
  const monthIndex = Number(m[2]) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1)).toISOString();
  const end = new Date(Date.UTC(year, monthIndex + 1, 1)).toISOString();
  if (end > getAttendanceRetentionCutoff()) return null;
  return { start, end };
}
