/**
 * Pure schedule helpers (no I/O) used to detect timetable clashes between groups.
 */

export const GROUP_DAYS = ['DUSH', 'SESH', 'CHOR', 'PAY', 'JU', 'SHAN', 'YAK'] as const;

const DAY_LABELS: Record<string, string> = {
  DUSH: 'Dush',
  SESH: 'Sesh',
  CHOR: 'Chor',
  PAY: 'Pay',
  JU: 'Ju',
  SHAN: 'Shan',
  YAK: 'Yak',
};

export interface ScheduleSlot {
  days: string[];
  startTime: string;
  endTime: string;
}

export interface ScheduledGroup extends ScheduleSlot {
  id: string;
  name: string;
  teacherId: string;
  roomId: string;
  status?: string;
}

export interface ScheduleConflict {
  type: 'teacher' | 'room' | 'student';
  group: ScheduledGroup;
  days: string[];
}

/** "09:00" / "9:05" / "09:00:00" -> minutes since midnight, or null when invalid. */
export function timeToMinutes(value: string | null | undefined): number | null {
  if (typeof value !== 'string') return null;
  const m = value.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function formatDays(days: string[]): string {
  return days.map((d) => DAY_LABELS[d] || d).join('/');
}

/** Returns an Uzbek error message when the slot itself is invalid, otherwise null. */
export function validateSlot(slot: Partial<ScheduleSlot>): string | null {
  if (!Array.isArray(slot.days) || slot.days.length === 0) {
    return 'Kamida bitta dars kunini tanlang';
  }
  if (slot.days.some((d) => !(GROUP_DAYS as readonly string[]).includes(d))) {
    return "Dars kunlari noto'g'ri";
  }
  const start = timeToMinutes(slot.startTime);
  const end = timeToMinutes(slot.endTime);
  if (start === null || end === null) {
    return "Dars vaqti noto'g'ri kiritilgan";
  }
  if (end <= start) {
    return "Tugash vaqti boshlanish vaqtidan keyin bo'lishi kerak";
  }
  return null;
}

/** Common days of two slots when their time ranges overlap, otherwise an empty array. */
export function overlappingDays(a: ScheduleSlot, b: ScheduleSlot): string[] {
  const aStart = timeToMinutes(a.startTime);
  const aEnd = timeToMinutes(a.endTime);
  const bStart = timeToMinutes(b.startTime);
  const bEnd = timeToMinutes(b.endTime);
  if (aStart === null || aEnd === null || bStart === null || bEnd === null) return [];
  // Touching ranges (11:00 end vs 11:00 start) do not overlap.
  if (!(aStart < bEnd && bStart < aEnd)) return [];
  const bDays = new Set(b.days || []);
  return (a.days || []).filter((d) => bDays.has(d));
}

const isActive = (g: ScheduledGroup) => !g.status || g.status === 'FAOL';

/**
 * Finds the first teacher or room clash between the candidate group and the other active groups.
 * Groups that are finished / paused never block a schedule.
 */
export function findGroupConflict(
  candidate: ScheduleSlot & { teacherId: string; roomId: string },
  others: ScheduledGroup[],
  excludeGroupId?: string
): ScheduleConflict | null {
  for (const other of others) {
    if (excludeGroupId && other.id === excludeGroupId) continue;
    if (!isActive(other)) continue;
    const days = overlappingDays(candidate, other);
    if (days.length === 0) continue;
    if (other.teacherId === candidate.teacherId) return { type: 'teacher', group: other, days };
    if (other.roomId === candidate.roomId) return { type: 'room', group: other, days };
  }
  return null;
}

/** First clash between a candidate slot and the groups a student already attends. */
export function findStudentConflict(
  candidate: ScheduleSlot,
  studentGroups: ScheduledGroup[],
  excludeGroupId?: string
): ScheduleConflict | null {
  for (const other of studentGroups) {
    if (excludeGroupId && other.id === excludeGroupId) continue;
    if (!isActive(other)) continue;
    const days = overlappingDays(candidate, other);
    if (days.length > 0) return { type: 'student', group: other, days };
  }
  return null;
}

export function describeConflict(conflict: ScheduleConflict): string {
  const when = `${formatDays(conflict.days)} kunlari ${conflict.group.startTime}–${conflict.group.endTime}`;
  if (conflict.type === 'teacher') {
    return `Bu ustozning ${when} da "${conflict.group.name}" guruhi bor. Boshqa vaqt yoki ustoz tanlang.`;
  }
  if (conflict.type === 'room') {
    return `Bu xona ${when} da "${conflict.group.name}" guruhi uchun band. Boshqa vaqt yoki xona tanlang.`;
  }
  return `Talabaning ${when} da "${conflict.group.name}" guruhida darsi bor. Vaqtlar to'qnashadi.`;
}
