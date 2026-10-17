/**
 * Attendance Retention Policy Utility
 *
 * Rule:
 * Keep only the current month and the previous calendar month.
 * Any attendance older than the 1st day of the previous calendar month is deleted permanently.
 *
 * Example:
 * In October 2026:
 * - Current month: October 2026
 * - Previous month: September 2026
 * - Cutoff: 2026-09-01T00:00:00.000Z
 * - August 2026 and older are deleted!
 *
 * In November 2026:
 * - Cutoff: 2026-10-01T00:00:00.000Z
 * - September 2026 and older are deleted!
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
 * Automatically purges all attendance records older than the cutoff date.
 */
export async function purgeExpiredAttendances(supabase: any, centerId?: string) {
  try {
    const cutoff = getAttendanceRetentionCutoff();
    let query = supabase.from('attendances').delete().lt('date', cutoff);
    if (centerId) {
      query = query.eq('centerId', centerId);
    }
    await query;
  } catch (err) {
    console.error('Failed to purge expired attendances:', err);
  }
}
