import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const sortBy = searchParams.get('sortBy') || 'date';
    const order = searchParams.get('order') === 'asc' ? true : false;
    const type = searchParams.get('type');

    const supabase = createServerSupabaseClient();
    let query = supabase
      .from('expenses')
      .select('*', { count: 'exact' })
      .eq('centerId', authUser.centerId);

    if (type) query = query.eq('type', type);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await query
      .order(sortBy, { ascending: order })
      .range(from, to);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 });
    }

    const body = await req.json();
    const { amount, type, ownerName, status, note, date } = body;

    const supabase = createServerSupabaseClient();
    const id = crypto.randomUUID();

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        id,
        amount: Number(amount) || 0,
        type: type || 'BOSHQA',
        ownerName: ownerName || null,
        status: status || 'TOLANGAN',
        note: note || null,
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        centerId: authUser.centerId,
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
