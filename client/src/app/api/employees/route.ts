import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/lib/dbErrors';
import crypto from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { clampLimit, clampPage, safeSearch } from '@/lib/pagedFetch';
import { ENUMS, date, firstError, numberValue, oneOf, phone as phoneRule, text } from '@/lib/validation';

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
    const search = safeSearch(searchParams.get('search'));
    const page = clampPage(searchParams.get('page'));
    const limit = clampLimit(searchParams.get('limit'), 10, 500);
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const order = searchParams.get('order') === 'asc' ? true : false;

    const supabase = createServerSupabaseClient();
    let query = supabase
      .from('employees')
      .select('*', { count: 'exact' })
      .eq('centerId', authUser.centerId);

    if (search) {
      query = query.or(`firstName.ilike.%${search}%,lastName.ilike.%${search}%,phone.ilike.%${search}%,position.ilike.%${search}%`);
    }

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
    const { firstName, lastName, phone, position, salary, status, hiredAt } = body;

    const inputError = firstError(
      text(firstName, 'Ism', 60),
      text(lastName, 'Familiya', 60),
      phoneRule(phone, 'Telefon raqam'),
      text(position, 'Lavozim', 100),
      numberValue(salary ?? 0, 'Oylik', { min: 0, max: 1_000_000_000_000 }),
      status ? oneOf(status, ENUMS.activeStatus, 'Holat') : null,
      hiredAt ? date(hiredAt, 'Ishga olingan sana') : null
    );
    if (inputError) {
      return NextResponse.json({ message: inputError }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const id = crypto.randomUUID();

    const { data, error } = await supabase
      .from('employees')
      .insert({
        id,
        firstName,
        lastName,
        phone,
        position,
        salary: Number(salary) || 0,
        status: status || 'FAOL',
        hiredAt: hiredAt ? new Date(hiredAt).toISOString() : new Date().toISOString(),
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
