import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/lib/dbErrors';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { forbidden, isTeacher, teacherOwnsGroup } from '@/lib/authz';
import { getAttendanceRetentionCutoff, purgeExpiredAttendances } from '@/lib/attendanceRetention';
import { fetchAll } from '@/lib/pagedFetch';

export async function GET(
  req: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: "Avtorizatsiyadan o'tilmagan" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    const supabase = createServerSupabaseClient();

    // A teacher sees the attendance of the groups they lead only
    if (isTeacher(authUser) && !(await teacherOwnsGroup(supabase, authUser, params.groupId))) {
      return forbidden();
    }

    // 2-month retention policy: purge attendance older than previous month
    await purgeExpiredAttendances(supabase, authUser.centerId);
    const retentionCutoff = getAttendanceRetentionCutoff();

    const targetDate = dateParam || (fromParam && !toParam ? fromParam : null);
    const data = await fetchAll<any>((from, to) => {
      // Explicit student columns: the raw row also carries the login/password blob
      let query = supabase
        .from('attendances')
        .select('*, student:students(id, firstName, lastName, phone, fatherPhone, motherPhone, status)')
        .eq('groupId', params.groupId)
        .eq('centerId', authUser.centerId)
        .gte('date', retentionCutoff);

      if (targetDate) {
        const cleanDate = targetDate.split('T')[0];
        query = query.gte('date', `${cleanDate}T00:00:00.000Z`).lte('date', `${cleanDate}T23:59:59.999Z`);
      } else if (fromParam && toParam) {
        const cleanFrom = fromParam.split('T')[0];
        const cleanTo = toParam.split('T')[0];
        query = query
          .gte('date', `${cleanFrom}T00:00:00.000Z`)
          .lte('date', `${cleanTo}T23:59:59.999Z`);
      }
      return query.order('id').range(from, to);
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return serverErrorResponse(error);
  }
}
