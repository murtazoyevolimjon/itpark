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

    const [payments, expenses] = await Promise.all([
      fetchAll((from, to) =>
        supabase.from('payments').select('id, amount, status').eq('centerId', authUser.centerId).order('id').range(from, to)
      ),
      fetchAll((from, to) =>
        supabase.from('expenses').select('id, amount, status').eq('centerId', authUser.centerId).order('id').range(from, to)
      ),
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
    return serverErrorResponse(error);
  }
}
