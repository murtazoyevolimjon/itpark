import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/lib/dbErrors';
import crypto from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { clampLimit, clampPage, safeSearch } from '@/lib/pagedFetch';
import { ENUMS, date as dateRule, firstError, money, oneOf, optionalText } from '@/lib/validation';

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 });
    }
    if (authUser.role === 'TEACHER' || authUser.role === 'STUDENT') {
      return NextResponse.json({ message: "Ruxsat yo'q" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = clampPage(searchParams.get('page'));
    const limit = clampLimit(searchParams.get('limit'), 10, 500);
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
      return serverErrorResponse(error);
    }

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (error: any) {
    return serverErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 });
    }
    if (authUser.role === 'TEACHER' || authUser.role === 'STUDENT') {
      return NextResponse.json({ message: "Ruxsat yo'q" }, { status: 403 });
    }

    const body = await req.json();
    const { amount, type, ownerName, status, note, date } = body;

    const checked = firstError(
      money(amount, 'Summa'),
      type ? oneOf(type, ENUMS.expenseType, 'Xarajat turi') : null,
      status ? oneOf(status, ENUMS.expenseStatus, 'Holat') : null,
      dateRule(date, 'Sana', { required: false }),
      optionalText(note, 'Izoh', 1000),
      optionalText(ownerName, 'Ism', 120)
    );
    if (checked) {
      return NextResponse.json({ message: checked }, { status: 400 });
    }

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
      return serverErrorResponse(error);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return serverErrorResponse(error);
  }
}
