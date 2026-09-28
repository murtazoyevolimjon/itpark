import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import {
  getTashkentDateString,
  checkAttendanceTimeEligibility,
} from '@/utils/attendanceTime';

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

      if (inserts.length > 0) {
        const { error: insertErr } = await supabase.from('attendances').insert(inserts);
        if (insertErr) {
          return NextResponse.json({ message: insertErr.message }, { status: 500 });
        }
      }

      return NextResponse.json({ success: true, count: inserts.length, locked: true });
    }

    // 5. If attendance was ALREADY TAKEN previously:
    // Rule: "O'qituvchi yoki admin 1 marta davomat olishi kerak shundan keyin saqlangan deb qulflanib qolishi kerak"
    // Teacher AND Admin cannot overwrite saved attendance.
    // The ONLY allowed operation is: KELMAGAN -> KECHIKKAN with a non-empty note, OR inserting a newly enrolled student.
    let updatedCount = 0;

    for (const rec of records) {
      const existing = (existingGroupAttendances || []).find(
        (att) => att.studentId === rec.studentId
      );

      if (existing) {
        // Only allow changing KELMAGAN -> KECHIKKAN
        if (existing.status === 'KELMAGAN' && rec.status === 'KECHIKKAN') {
          if (!rec.note || !rec.note.trim()) {
            return NextResponse.json(
              { message: "Kechikib kelgan o'quvchi uchun kechikish sababini yozish majburiy!" },
              { status: 400 }
            );
          }

          await supabase
            .from('attendances')
            .update({
              status: 'KECHIKKAN',
              note: rec.note.trim(),
              updatedAt: new Date().toISOString(),
            })
            .eq('id', existing.id);

          updatedCount++;
        }
        // All other transitions on existing records (e.g. KELGAN -> KELMAGAN) are strictly prohibited
      } else {
        // Newly added student in the group who didn't have an attendance record yet
        await supabase.from('attendances').insert({
          id: crypto.randomUUID(),
          studentId: rec.studentId,
          groupId,
          date: startOfDay,
          status: rec.status,
          note: rec.note || null,
          centerId: authUser.centerId,
          updatedAt: new Date().toISOString(),
        });
        updatedCount++;
      }
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
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
