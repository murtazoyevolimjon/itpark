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
      .select('amount, paymentDate, status')
      .eq('centerId', authUser.centerId)
      .eq('status', 'TOLANGAN');

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
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
