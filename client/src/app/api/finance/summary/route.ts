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

    const [{ data: payments }, { data: expenses }] = await Promise.all([
      supabase.from('payments').select('amount, status').eq('centerId', authUser.centerId),
      supabase.from('expenses').select('amount, status').eq('centerId', authUser.centerId),
    ]);

    let totalIncome = 0;
    let debt = 0;
    (payments || []).forEach((p: any) => {
      if (p.status === 'TOLANGAN') {
        totalIncome += Number(p.amount) || 0;
      } else if (p.status === 'TOLANMAGAN' || p.status === 'QISMAN') {
        debt += Number(p.amount) || 0;
      }
    });

    let totalExpenses = 0;
    (expenses || []).forEach((e: any) => {
      if (e.status === 'TOLANGAN') {
        totalExpenses += Number(e.amount) || 0;
      }
    });

    const netProfit = totalIncome - totalExpenses;

    return NextResponse.json({
      totalIncome,
      totalExpenses,
      debt,
      netProfit,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
