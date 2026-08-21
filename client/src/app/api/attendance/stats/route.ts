import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30', 10);

    const supabase = createServerSupabaseClient();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: records, error } = await supabase
      .from('attendances')
      .select('date, status')
      .eq('centerId', authUser.centerId)
      .gte('date', startDate.toISOString())
      .order('date', { ascending: true });

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    // Aggregate by date
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

    const dailyStats = Object.entries(dateMap).map(([date, counts]) => ({
      date,
      presentPercentage: counts.total > 0 ? Math.round((counts.present / counts.total) * 100) : 0,
      ...counts,
    }));

    const totalRecords = records?.length || 0;
    const totalPresent = records?.filter((r: any) => r.status === 'KELGAN').length || 0;
    const overallPercentage = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 100;

    return NextResponse.json({
      overallPercentage,
      dailyStats,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
