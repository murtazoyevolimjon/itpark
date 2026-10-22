import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { dbErrorResponse, serverErrorResponse } from '@/lib/dbErrors';
import { checkGroupReferences, checkGroupSchedule, violationResponse } from '@/lib/groupRules';
import { validateSlot } from '@/lib/schedule';
import { ENUMS, date, firstError, oneOf, text } from '@/lib/validation';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    const { data: group, error } = await supabase
      .from('groups')
      .select(`
        *,
        course:courses(*),
        teacher:teachers(id, firstName, lastName, phone, status, centerId, salaryType, salaryValue),
        room:rooms(*),
        studentGroups:student_groups(*, student:students(*)),
        attendances:attendances(*, student:students(id, firstName, lastName, phone)),
        payments:payments(*)
      `)
      .eq('id', params.id)
      .eq('centerId', authUser.centerId)
      .maybeSingle();

    if (error || !group) {
      return NextResponse.json({ message: 'Guruh topilmadi' }, { status: 404 });
    }

    // A teacher sees only the groups they lead
    if (authUser.role === 'TEACHER' && group.teacherId !== authUser.sub) {
      return NextResponse.json({ message: "Siz faqat o'zingizning guruhingizni ko'ra olasiz" }, { status: 403 });
    }

    // Students' login / Telegram blob (passportSeries) is for staff only
    if (authUser.role === 'TEACHER') {
      for (const sg of group.studentGroups || []) {
        if (sg.student) sg.student = { ...sg.student, passportSeries: null };
      }
      if (group.teacher) group.teacher = { ...group.teacher, password: null, passportSeries: null };
    }

    // Also fetch all payments of the students enrolled in this group
    const studentIds = (group.studentGroups || [])
      .map((sg: any) => sg.studentId || sg.student?.id)
      .filter(Boolean);

    let allGroupPayments = group.payments || [];

    if (studentIds.length > 0) {
      const { data: studentPayments } = await supabase
        .from('payments')
        .select('*')
        .eq('centerId', authUser.centerId)
        .in('studentId', studentIds);

      if (studentPayments && studentPayments.length > 0) {
        // Merge without duplicates
        const paymentMap = new Map();
        [...allGroupPayments, ...studentPayments].forEach((p) => {
          paymentMap.set(p.id, p);
        });
        allGroupPayments = Array.from(paymentMap.values());
      }
    }

    return NextResponse.json({
      ...group,
      payments: allGroupPayments,
    });
  } catch (error: any) {
    return serverErrorResponse(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 });
    }

    if (authUser.role === 'TEACHER') {
      return NextResponse.json({ message: "O'qituvchilar guruhni tahrirlay olmaydi" }, { status: 403 });
    }

    const body = await req.json();
    const supabase = createServerSupabaseClient();

    const { data: current } = await supabase
      .from('groups')
      .select('id, name, courseId, teacherId, roomId, days, startTime, endTime, status')
      .eq('id', params.id)
      .eq('centerId', authUser.centerId)
      .maybeSingle();

    if (!current) {
      return NextResponse.json({ message: 'Guruh topilmadi' }, { status: 404 });
    }

    const inputError = firstError(
      body.name !== undefined ? text(body.name, 'Guruh nomi', 100) : null,
      body.status !== undefined ? oneOf(body.status, ENUMS.groupStatus, 'Guruh holati') : null,
      body.startDate !== undefined ? date(body.startDate, 'Boshlanish sanasi') : null
    );
    if (inputError) {
      return NextResponse.json({ message: inputError }, { status: 400 });
    }

    const next = {
      courseId: body.courseId !== undefined ? body.courseId : current.courseId,
      teacherId: body.teacherId !== undefined ? body.teacherId : current.teacherId,
      roomId: body.roomId !== undefined ? body.roomId : current.roomId,
      days: body.days !== undefined ? body.days : current.days,
      startTime: body.startTime !== undefined ? body.startTime : current.startTime,
      endTime: body.endTime !== undefined ? body.endTime : current.endTime,
      status: body.status !== undefined ? body.status : current.status,
    };

    const refsChanged =
      next.courseId !== current.courseId || next.teacherId !== current.teacherId || next.roomId !== current.roomId;
    if (refsChanged) {
      const refViolation = await checkGroupReferences(supabase, authUser.centerId, next);
      if (refViolation) return violationResponse(refViolation);
    }

    // Re-check the timetable only when something that affects it changed (or the group is re-activated),
    // so renaming an already clashing legacy group is still possible.
    const scheduleChanged =
      refsChanged ||
      JSON.stringify(next.days) !== JSON.stringify(current.days) ||
      next.startTime !== current.startTime ||
      next.endTime !== current.endTime ||
      (next.status === 'FAOL' && current.status !== 'FAOL');
    if (scheduleChanged) {
      const slotError = validateSlot(next);
      if (slotError) return NextResponse.json({ message: slotError }, { status: 400 });
      if (next.status === 'FAOL') {
        const scheduleViolation = await checkGroupSchedule(supabase, authUser.centerId, next, params.id);
        if (scheduleViolation) return violationResponse(scheduleViolation);
      }
    }

    const updatePayload: any = { updatedAt: new Date().toISOString() };
    if (body.name !== undefined) updatePayload.name = String(body.name).trim();
    if (body.courseId !== undefined) updatePayload.courseId = body.courseId;
    if (body.teacherId !== undefined) updatePayload.teacherId = body.teacherId;
    if (body.roomId !== undefined) updatePayload.roomId = body.roomId;
    if (body.days !== undefined) updatePayload.days = body.days;
    if (body.startTime !== undefined) updatePayload.startTime = body.startTime;
    if (body.endTime !== undefined) updatePayload.endTime = body.endTime;
    if (body.status !== undefined) updatePayload.status = body.status;
    if (body.startDate !== undefined) updatePayload.startDate = new Date(body.startDate).toISOString();

    const { data, error } = await supabase
      .from('groups')
      .update(updatePayload)
      .eq('id', params.id)
      .eq('centerId', authUser.centerId)
      .select()
      .single();

    if (error) {
      return dbErrorResponse(error);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return serverErrorResponse(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 });
    }

    if (authUser.role === 'TEACHER') {
      return NextResponse.json({ message: "O'qituvchilar guruhni o'chira olmaydi" }, { status: 403 });
    }

    const supabase = createServerSupabaseClient();

    // Deleting cascades to memberships and attendance history, so only empty groups may be removed.
    const [members, attendanceRows] = await Promise.all([
      supabase.from('student_groups').select('id', { count: 'exact', head: true }).eq('groupId', params.id),
      supabase.from('attendances').select('id', { count: 'exact', head: true }).eq('groupId', params.id),
    ]);
    if ((members.count || 0) > 0) {
      return NextResponse.json(
        {
          message: `Guruhda ${members.count} ta talaba bor. Avval ularni boshqa guruhga o'tkazing yoki guruh holatini "TUGAGAN" qiling.`,
        },
        { status: 409 }
      );
    }
    if ((attendanceRows.count || 0) > 0) {
      return NextResponse.json(
        { message: "Guruhda davomat tarixi bor. O'chirish o'rniga guruh holatini \"TUGAGAN\" qiling." },
        { status: 409 }
      );
    }

    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', params.id)
      .eq('centerId', authUser.centerId);

    if (error) {
      return dbErrorResponse(error);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return serverErrorResponse(error);
  }
}
