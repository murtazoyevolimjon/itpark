import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/lib/dbErrors';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { requireStaff } from '@/lib/authz';
import { getAttendanceRetentionCutoff, purgeExpiredAttendances } from '@/lib/attendanceRetention';
import { fetchAll } from '@/lib/pagedFetch';

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 });
    }

    const staffOnly = requireStaff(authUser);
    if (staffOnly) return staffOnly;

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '7', 10);

    const supabase = createServerSupabaseClient();
    await purgeExpiredAttendances(supabase, authUser.centerId);
    const retentionCutoff = getAttendanceRetentionCutoff();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const effectiveStart = startDate.toISOString() > retentionCutoff ? startDate.toISOString() : retentionCutoff;

    const records = await fetchAll<any>((from, to) =>
      supabase
        .from('attendances')
        .select('id, date, status')
        .eq('centerId', authUser.centerId)
        .gte('date', effectiveStart)
        .order('id')
        .range(from, to)
    );
    records.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const dateMap: Record<string, { present: number; absent: number; late: number; total: number }> = {};
    (records || []).forEach((r: any) => {
      const d = r.date.split('T')[0];
      if (!dateMap[d]) {
        dateMap[d] = { present: 0, absent: 0, late: 0, total: 0 };
      }
      dateMap[d].total += 1;
      if (r.status === 'KELGAN') dateMap[d].present += 1;
      else if (r.status === 'KELMAGAN') dateMap[d].absent += 1;
      else if (r.status === 'KECHIKKAN') dateMap[d].late += 1;
    });

    const result = Object.entries(dateMap).map(([date, counts]) => ({
      date,
      presentPercentage: counts.total > 0 ? Math.round((counts.present / counts.total) * 100) : 0,
      ...counts,
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    return serverErrorResponse(error);
  }
}
