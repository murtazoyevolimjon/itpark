import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';

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
    let query = supabase
      .from('attendances')
      .select('*, student:students(*)')
      .eq('groupId', params.groupId)
      .eq('centerId', authUser.centerId);

    const targetDate = dateParam || (fromParam && !toParam ? fromParam : null);
    if (targetDate) {
      const cleanDate = targetDate.split('T')[0];
      const startOfDay = `${cleanDate}T00:00:00.000Z`;
      const endOfDay = `${cleanDate}T23:59:59.999Z`;
      query = query.gte('date', startOfDay).lte('date', endOfDay);
    } else if (fromParam && toParam) {
      const cleanFrom = fromParam.split('T')[0];
      const cleanTo = toParam.split('T')[0];
      query = query
        .gte('date', `${cleanFrom}T00:00:00.000Z`)
        .lte('date', `${cleanTo}T23:59:59.999Z`);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
