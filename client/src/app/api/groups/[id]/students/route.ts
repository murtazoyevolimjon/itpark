import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { forbidden, isTeacher, teacherOwnsGroup } from '@/lib/authz';
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

    const { studentId } = await req.json();
    if (!studentId) {
      return NextResponse.json({ message: 'Talaba tanlanishi shart' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // A teacher may add students to the groups they lead only
    if (isTeacher(authUser) && !(await teacherOwnsGroup(supabase, authUser, params.id))) {
      return forbidden();
    }

    // Check if already in group
    const { data: existing } = await supabase
      .from('student_groups')
      .select('id')
      .eq('groupId', params.id)
      .eq('studentId', studentId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ message: 'Talaba bu guruhda allaqachon mavjud' }, { status: 400 });
    }

    // Group/student belong to this center, group is open, room has a free seat, no timetable clash.
    const violation = await checkEnrollment(supabase, authUser.centerId, params.id, studentId);
    if (violation) return violationResponse(violation);

    const id = crypto.randomUUID();
    const { data, error } = await supabase
      .from('student_groups')
      .insert({
        id,
        groupId: params.id,
        studentId,
        centerId: authUser.centerId,
        joinedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select('*, student:students(*)')
      .single();

    if (error) {
      return dbErrorResponse(error);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return serverErrorResponse(error);
  }
}
