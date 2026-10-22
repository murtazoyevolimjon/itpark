import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { requireStaff } from '@/lib/authz';
import { dbErrorResponse, serverErrorResponse } from '@/lib/dbErrors';
import { checkEnrollment, violationResponse } from '@/lib/groupRules';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: "Avtorizatsiyadan o'tilmagan" }, { status: 401 });
    }

    const staffOnly = requireStaff(authUser);
    if (staffOnly) return staffOnly;

    const sourceGroupId = params.id;
    const body = await req.json();
    const { studentId, targetGroupId } = body;

    if (!studentId || !targetGroupId) {
      return NextResponse.json(
        { message: 'Talaba va yangi guruh tanlanishi shart' },
        { status: 400 }
      );
    }

    if (sourceGroupId === targetGroupId) {
      return NextResponse.json(
        { message: 'Talaba allaqachon ushbu guruhda' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // 1. Check source group
    const { data: sourceGroup, error: sourceError } = await supabase
      .from('groups')
      .select('id, name')
      .eq('id', sourceGroupId)
      .eq('centerId', authUser.centerId)
      .maybeSingle();

    if (sourceError || !sourceGroup) {
      return NextResponse.json({ message: 'Hozirgi guruh topilmadi' }, { status: 404 });
    }

    // 2. Check target group
    const { data: targetGroup, error: targetError } = await supabase
      .from('groups')
      .select('id, name, courseId')
      .eq('id', targetGroupId)
      .eq('centerId', authUser.centerId)
      .maybeSingle();

    if (targetError || !targetGroup) {
      return NextResponse.json({ message: "O'tkazilayotgan yangi guruh topilmadi" }, { status: 404 });
    }

    // 3. Check student
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, firstName, lastName')
      .eq('id', studentId)
      .eq('centerId', authUser.centerId)
      .maybeSingle();

    if (studentError || !student) {
      return NextResponse.json({ message: 'Talaba topilmadi' }, { status: 404 });
    }

    // 4. The student must really be in the source group
    const { data: sourceMembership } = await supabase
      .from('student_groups')
      .select('id')
      .eq('groupId', sourceGroupId)
      .eq('studentId', studentId)
      .maybeSingle();

    if (!sourceMembership) {
      return NextResponse.json({ message: 'Talaba hozirgi guruhda topilmadi' }, { status: 404 });
    }

    // 5. Target group must accept the student (open, free seat, no timetable clash).
    //    The source group is ignored because the student is leaving it.
    const { data: existingTarget } = await supabase
      .from('student_groups')
      .select('id')
      .eq('groupId', targetGroupId)
      .eq('studentId', studentId)
      .maybeSingle();

    if (!existingTarget) {
      const violation = await checkEnrollment(supabase, authUser.centerId, targetGroupId, studentId, [sourceGroupId]);
      if (violation) return violationResponse(violation);

      // Add to the target FIRST so a failure can never leave the student without any group
      const { error: insertError } = await supabase
        .from('student_groups')
        .insert({
          id: crypto.randomUUID(),
          groupId: targetGroupId,
          studentId,
          centerId: authUser.centerId,
          joinedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

      if (insertError) {
        return dbErrorResponse(insertError);
      }
    }

    // 6. Remove the student from the source group
    const { error: deleteError } = await supabase
      .from('student_groups')
      .delete()
      .eq('groupId', sourceGroupId)
      .eq('studentId', studentId)
      .eq('centerId', authUser.centerId);

    if (deleteError) {
      return serverErrorResponse(deleteError);
    }

    return NextResponse.json({
      success: true,
      message: `${student.firstName} ${student.lastName} muvaffaqiyatli "${targetGroup.name}" guruhiga o'tkazildi!`,
      sourceGroup,
      targetGroup,
      student,
    });
  } catch (error: any) {
    return serverErrorResponse(error);
  }
}
