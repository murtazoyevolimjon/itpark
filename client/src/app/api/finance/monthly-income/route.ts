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
        .select('id, amount, paymentDate, status')
        .eq('centerId', authUser.centerId)
        .eq('status', 'TOLANGAN')
        .order('id')
        .range(from, to)
    );

    const monthlyMap: Record<string, number> = {};
    (payments || []).forEach((p: any) => {
      const month = p.paymentDate ? p.paymentDate.substring(0, 7) : '2026-08';
      monthlyMap[month] = (monthlyMap[month] || 0) + (Number(p.amount) || 0);
    });

    const result = Object.entries(monthlyMap).map(([month, income]) => ({
      month,
      income,
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    return serverErrorResponse(error);
  }
}
