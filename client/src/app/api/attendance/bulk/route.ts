import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/lib/dbErrors';
import crypto from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import {
  getTashkentDateString,
  checkAttendanceTimeEligibility,
} from '@/utils/attendanceTime';
import { parseStudentCreds } from '@/lib/credentials';
import { fetchCenterName, sendAttendanceAlert } from '@/lib/telegram';
import { ENUMS } from '@/lib/validation';

export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: "Avtorizatsiyadan o'tilmagan" }, { status: 401 });
    }

    const body = await req.json();
    const { groupId, date, records } = body;

    if (!groupId || !date || !Array.isArray(records)) {
      return NextResponse.json({ message: "Noto'g'ri ma'lumotlar" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const cleanDate = date.split('T')[0];
    const todayTashkent = getTashkentDateString();

    // 1. DATE RESTRICTION: Attendance can ONLY be saved for TODAY ("faqat o'sha kungi davomatni, bir kun oldingilarga saqlay olmasligi kerak")
    if (cleanDate !== todayTashkent) {
      return NextResponse.json(
        {
          message:
            "Davomat faqat bugungi dars kuni uchun olinishi mumkin! O'tgan yoki kelgusi kunlar uchun davomat saqlash taqiqlangan.",
        },
        { status: 400 }
      );
    }

    const startOfDay = `${cleanDate}T00:00:00.000Z`;
    const endOfDay = `${cleanDate}T23:59:59.999Z`;

    const isTeacher = authUser.role === 'TEACHER';

    // 2. Fetch Group details
    const { data: grp, error: grpError } = await supabase
      .from('groups')
      .select('id, name, startTime, endTime, teacherId')
      .eq('id', groupId)
      .eq('centerId', authUser.centerId)
      .maybeSingle();

    if (grpError || !grp) {
      return NextResponse.json({ message: 'Guruh topilmadi' }, { status: 404 });
    }

    // Verify teacher owns this group
    if (isTeacher && grp.teacherId !== authUser.sub) {
      return NextResponse.json(
        { message: "Siz faqat o'zingizning guruhingizga davomat ola olasiz" },
        { status: 403 }
      );
    }

    // Only students enrolled in this group can be marked, with a valid status, once each
    const { data: memberRows } = await supabase
      .from('student_groups')
      .select('studentId')
      .eq('groupId', groupId)
      .eq('centerId', authUser.centerId);
    const memberIds = new Set((memberRows || []).map((m: any) => m.studentId));
    const seen = new Set<string>();
    for (const rec of records) {
      if (!rec || typeof rec.studentId !== 'string' || !ENUMS.attendanceStatus.includes(rec.status)) {
        return NextResponse.json({ message: "Davomat ma'lumotlari noto'g'ri" }, { status: 400 });
      }
      if (!memberIds.has(rec.studentId)) {
        return NextResponse.json({ message: "Talaba bu guruhga tegishli emas" }, { status: 400 });
      }
      if (seen.has(rec.studentId)) {
        return NextResponse.json({ message: 'Bitta talaba ikki marta belgilangan' }, { status: 400 });
      }
      seen.add(rec.studentId);
    }

    // 3. Check existing attendances for this group on this date
    const { data: existingGroupAttendances } = await supabase
      .from('attendances')
      .select('id, studentId, status, note')
      .eq('groupId', groupId)
      .gte('date', startOfDay)
      .lte('date', endOfDay);

    const hasExistingGroupAttendance =
      Array.isArray(existingGroupAttendances) && existingGroupAttendances.length > 0;

    // 4. If initial attendance taking (no attendances saved yet for today)
    if (!hasExistingGroupAttendance) {
      // Validate time eligibility (e.g. 10:00 class must be taken before 10:30)
      const timeEligibility = checkAttendanceTimeEligibility(cleanDate, grp);
      if (!timeEligibility.canTakeAttendance) {
        return NextResponse.json(
          { message: timeEligibility.message },
          { status: 400 }
        );
      }

      // Insert all records for the initial attendance
      const inserts = records.map((rec) => ({
        id: crypto.randomUUID(),
        studentId: rec.studentId,
        groupId,
        date: startOfDay,
        status: rec.status,
        note: rec.note || null,
        centerId: authUser.centerId,
        updatedAt: new Date().toISOString(),
      }));

      let insertedCount = 0;
      if (inserts.length > 0) {
        // Another admin may save the same lesson at the same moment: the unique
        // (studentId, groupId, date) key makes the duplicate rows get skipped.
        const { data: insertedRows, error: insertErr } = await supabase
          .from('attendances')
          .upsert(inserts, { onConflict: 'studentId,groupId,date', ignoreDuplicates: true })
          .select('id');
        if (insertErr) {
          return serverErrorResponse(insertErr);
        }
        insertedCount = insertedRows?.length || 0;

        if (insertedCount === 0) {
          return NextResponse.json({
            success: true,
            count: 0,
            locked: true,
            message: 'Davomat allaqachon saqlangan (boshqa admin tomonidan).',
          });
        }
      }

      await markBillingStart(supabase, groupId, inserts.map((r) => r.studentId), startOfDay);
      await dispatchTelegramAttendanceAlerts(supabase, records, grp, cleanDate, authUser.centerName, authUser.centerId);

      return NextResponse.json({ success: true, count: insertedCount, locked: true });
    }

    // 5. If attendance was ALREADY TAKEN previously:
    // Rule: "O'qituvchi yoki admin 1 marta davomat olishi kerak shundan keyin saqlangan deb qulflanib qolishi kerak"
    // Teacher AND Admin cannot overwrite saved attendance.
    // The ONLY allowed operation is: KELMAGAN -> KECHIKKAN with a non-empty note, OR inserting a newly enrolled student.
    const existingByStudent = new Map(
      (existingGroupAttendances || []).map((att) => [att.studentId, att])
    );
    const nowIso = new Date().toISOString();
    const lateUpdates: { id: string; note: string }[] = [];
    const newInserts: any[] = [];

    for (const rec of records) {
      const existing = existingByStudent.get(rec.studentId);

      if (existing) {
        // Only allow changing KELMAGAN -> KECHIKKAN
        if (existing.status === 'KELMAGAN' && rec.status === 'KECHIKKAN') {
          if (!rec.note || !rec.note.trim()) {
            return NextResponse.json(
              { message: "Kechikib kelgan o'quvchi uchun kechikish sababini yozish majburiy!" },
              { status: 400 }
            );
          }

          lateUpdates.push({ id: existing.id, note: rec.note.trim() });
        }
        // All other transitions on existing records (e.g. KELGAN -> KELMAGAN) are strictly prohibited
      } else {
        // Newly added student in the group who didn't have an attendance record yet
        newInserts.push({
          id: crypto.randomUUID(),
          studentId: rec.studentId,
          groupId,
          date: startOfDay,
          status: rec.status,
          note: rec.note || null,
          centerId: authUser.centerId,
          updatedAt: nowIso,
        });
      }
    }

    // Apply all changes at once: one bulk insert + parallel updates
    await Promise.all([
      newInserts.length > 0
        ? supabase
            .from('attendances')
            .upsert(newInserts, { onConflict: 'studentId,groupId,date', ignoreDuplicates: true })
        : Promise.resolve(),
      ...lateUpdates.map((u) =>
        supabase
          .from('attendances')
          .update({ status: 'KECHIKKAN', note: u.note, updatedAt: nowIso })
          .eq('id', u.id)
      ),
    ]);

    await markBillingStart(supabase, groupId, newInserts.map((r) => r.studentId), startOfDay);

    const updatedCount = lateUpdates.length + newInserts.length;

    if (updatedCount > 0) {
      await dispatchTelegramAttendanceAlerts(supabase, records, grp, cleanDate, authUser.centerName, authUser.centerId);
    }

    return NextResponse.json({
      success: true,
      count: updatedCount,
      locked: true,
      message:
        updatedCount > 0
          ? "Davomat yangilandi."
          : "Davomat allaqachon saqlangan va qulflangan!",
    });
  } catch (error: any) {
    return serverErrorResponse(error);
  }
}

/**
 * The monthly debt of a student in a group starts with the first attendance. The date is kept on the
 * membership (attendance rows are deleted after two months). An earlier date replaces a later one.
 * Never blocks saving the attendance: before the migration the column does not exist yet.
 */
async function markBillingStart(supabase: any, groupId: string, studentIds: string[], date: string) {
  if (studentIds.length === 0) return;
  try {
    const { error } = await supabase
      .from('student_groups')
      .update({ billingStartDate: date })
      .eq('groupId', groupId)
      .in('studentId', studentIds)
      .or(`billingStartDate.is.null,billingStartDate.gt.${date}`);
    if (error && !/billingStartDate/i.test(error.message || '')) {
      console.error('markBillingStart failed:', error.message);
    }
  } catch (err) {
    console.error('markBillingStart failed:', err);
  }
}

async function dispatchTelegramAttendanceAlerts(
  supabase: any,
  records: any[],
  group: any,
  cleanDate: string,
  centerName: string | undefined,
  centerId: string
) {
  try {
    const studentIds = records.map((r) => r.studentId).filter(Boolean);
    if (studentIds.length === 0) return;
    centerName = centerName || (await fetchCenterName(supabase, centerId));

    const { data: students } = await supabase
      .from('students')
      .select('id, firstName, lastName, phone, passportSeries')
      .in('id', studentIds);

    if (!students || students.length === 0) return;

    const studentMap = new Map(students.map((s: any) => [s.id, s]));

    const jobs: (() => Promise<unknown>)[] = [];
    for (const rec of records) {
      const student: any = studentMap.get(rec.studentId);
      if (!student) continue;

      const creds = parseStudentCreds(student.passportSeries, student.phone);
      const studentChatId = creds.tgChatId;
      const parentChatId = creds.parentTgChatId;

      if (!studentChatId && !parentChatId) continue;

      const studentName = `${student.firstName} ${student.lastName}`.trim();

      jobs.push(() =>
        sendAttendanceAlert({
          studentName,
          status: rec.status,
          date: cleanDate,
          groupName: group?.name || 'Guruh',
          chatId: studentChatId,
          parentChatId,
          centerName,
        }).catch((err) => console.error('Error sending attendance telegram alert:', err))
      );
    }

    // Awaited in small batches: serverless functions can be frozen right after the response,
    // which silently dropped parents' notifications; batching also stays under Telegram's rate limit
    for (let i = 0; i < jobs.length; i += 10) {
      await Promise.allSettled(jobs.slice(i, i + 10).map((run) => run()));
    }
  } catch (err) {
    console.error('Failed to dispatch telegram attendance alerts:', err);
  }
}

