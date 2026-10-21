import { NextResponse } from 'next/server';
import {
  ScheduledGroup,
  ScheduleSlot,
  describeConflict,
  findGroupConflict,
  findStudentConflict,
  validateSlot,
} from './schedule';

export interface RuleViolation {
  status: number;
  message: string;
}

export const violationResponse = (v: RuleViolation) =>
  NextResponse.json({ message: v.message }, { status: v.status });

const GROUP_COLUMNS = 'id, name, teacherId, roomId, days, startTime, endTime, status';

/** The course, teacher and room of a group must exist in the caller's center (no cross-center ids). */
export async function checkGroupReferences(
  supabase: any,
  centerId: string,
  refs: { courseId: string; teacherId: string; roomId: string }
): Promise<RuleViolation | null> {
  for (const key of ['courseId', 'teacherId', 'roomId'] as const) {
    if (typeof refs[key] !== 'string' || !refs[key]) {
      const label = key === 'courseId' ? 'Kurs' : key === 'teacherId' ? 'Ustoz' : 'Xona';
      return { status: 400, message: `${label} tanlanishi shart` };
    }
  }

  const [course, teacher, room] = await Promise.all([
    supabase.from('courses').select('id').eq('id', refs.courseId).eq('centerId', centerId).maybeSingle(),
    supabase.from('teachers').select('id, status').eq('id', refs.teacherId).eq('centerId', centerId).maybeSingle(),
    supabase.from('rooms').select('id').eq('id', refs.roomId).eq('centerId', centerId).maybeSingle(),
  ]);

  if (!course.data) return { status: 400, message: 'Tanlangan kurs topilmadi' };
  if (!teacher.data) return { status: 400, message: 'Tanlangan ustoz topilmadi' };
  if (teacher.data.status === 'NOFAOL') {
    return { status: 400, message: 'Tanlangan ustoz nofaol holatda. Faol ustozni tanlang' };
  }
  if (!room.data) return { status: 400, message: 'Tanlangan xona topilmadi' };
  return null;
}

/** Validates the slot and checks teacher / room availability against the center's active groups. */
export async function checkGroupSchedule(
  supabase: any,
  centerId: string,
  candidate: ScheduleSlot & { teacherId: string; roomId: string },
  excludeGroupId?: string
): Promise<RuleViolation | null> {
  const slotError = validateSlot(candidate);
  if (slotError) return { status: 400, message: slotError };

  const [byTeacher, byRoom] = await Promise.all([
    supabase.from('groups').select(GROUP_COLUMNS).eq('centerId', centerId).eq('teacherId', candidate.teacherId),
    supabase.from('groups').select(GROUP_COLUMNS).eq('centerId', centerId).eq('roomId', candidate.roomId),
  ]);

  const others: ScheduledGroup[] = [...(byTeacher.data || []), ...(byRoom.data || [])];
  const conflict = findGroupConflict(candidate, others, excludeGroupId);
  return conflict ? { status: 409, message: describeConflict(conflict) } : null;
}

/**
 * Rules for putting a student into a group: the group is open, the student belongs to the center,
 * the room has a free seat and the student has no other group at the same time.
 * `ignoreGroupIds` are memberships that are being removed in the same operation (transfer / group change).
 */
export async function checkEnrollment(
  supabase: any,
  centerId: string,
  groupId: string,
  studentId: string | null,
  ignoreGroupIds: string[] = []
): Promise<RuleViolation | null> {
  // The four reads do not depend on each other: fetch them at the same time (one round trip instead of four),
  // then apply the rules in the same order as before.
  const [groupRes, studentRes, membersRes, membershipsRes] = await Promise.all([
    supabase
      .from('groups')
      .select(`${GROUP_COLUMNS}, room:rooms(capacity, name)`)
      .eq('id', groupId)
      .eq('centerId', centerId)
      .maybeSingle(),
    studentId
      ? supabase.from('students').select('id').eq('id', studentId).eq('centerId', centerId).maybeSingle()
      : Promise.resolve({ data: true }),
    supabase.from('student_groups').select('studentId').eq('groupId', groupId),
    studentId
      ? supabase.from('student_groups').select(`groupId, group:groups(${GROUP_COLUMNS})`).eq('studentId', studentId)
      : Promise.resolve({ data: [] }),
  ]);

  const group = groupRes.data;
  if (!group) return { status: 404, message: 'Guruh topilmadi' };
  if (group.status === 'TUGAGAN') {
    return { status: 400, message: "Bu guruh tugagan, unga yangi talaba qo'shib bo'lmaydi" };
  }

  if (studentId && !studentRes.data) return { status: 404, message: 'Talaba topilmadi' };

  const capacity = Number(group.room?.capacity) || 0;
  if (capacity > 0) {
    const members = (membersRes.data as any[]) || [];
    const alreadyIn = studentId ? members.some((m: any) => m.studentId === studentId) : false;
    if (!alreadyIn && members.length >= capacity) {
      return {
        status: 409,
        message: `Guruh to'lgan: "${group.room?.name || 'xona'}" sig'imi ${capacity} ta. Boshqa xona tanlang yoki xona sig'imini oshiring.`,
      };
    }
  }

  if (studentId) {
    const studentGroups: ScheduledGroup[] = ((membershipsRes.data as any[]) || [])
      .filter((m: any) => m.group && !ignoreGroupIds.includes(m.groupId))
      .map((m: any) => m.group);

    const conflict = findStudentConflict(group, studentGroups, groupId);
    if (conflict) return { status: 409, message: describeConflict(conflict) };
  }

  return null;
}
