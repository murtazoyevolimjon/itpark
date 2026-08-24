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
    const date = searchParams.get('date');

    const supabase = createServerSupabaseClient();
    let query = supabase
      .from('attendances')
      .select('*, student:students(*)')
      .eq('groupId', params.groupId)
      .eq('centerId', authUser.centerId);

    if (date) {
      const cleanDate = date.split('T')[0];
      const startOfDay = `${cleanDate}T00:00:00.000Z`;
      const endOfDay = `${cleanDate}T23:59:59.999Z`;
      query = query.gte('date', startOfDay).lte('date', endOfDay);
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
