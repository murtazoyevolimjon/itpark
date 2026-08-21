import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    const { data: payments } = await supabase
      .from('payments')
      .select('amount, course:courses(name)')
      .eq('centerId', authUser.centerId)
      .eq('status', 'TOLANGAN');

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
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
