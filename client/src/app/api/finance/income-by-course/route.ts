import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/lib/dbErrors';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { fetchAll } from '@/lib/pagedFetch';

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 });
    }
    if (authUser.role === 'TEACHER' || authUser.role === 'STUDENT') {
      return NextResponse.json({ message: "Ruxsat yo'q" }, { status: 403 });
    }

    const supabase = createServerSupabaseClient();
    const payments = await fetchAll((from, to) =>
      supabase
        .from('payments')
        .select('id, amount, course:courses(name)')
        .eq('centerId', authUser.centerId)
        .eq('status', 'TOLANGAN')
        .order('id')
        .range(from, to)
    );

    const courseMap: Record<string, number> = {};
    (payments || []).forEach((p: any) => {
      const courseName = (p.course as any)?.name || 'Boshqa';
      courseMap[courseName] = (courseMap[courseName] || 0) + (Number(p.amount) || 0);
    });

    const result = Object.entries(courseMap).map(([courseName, total]) => ({
      courseName,
      total,
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    return serverErrorResponse(error);
  }
}
