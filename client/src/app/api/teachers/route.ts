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
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const order = searchParams.get('order') === 'asc' ? true : false;

    const supabase = createServerSupabaseClient();
    let query = supabase
      .from('teachers')
      .select('*, groups:groups(count)', { count: 'exact' })
      .eq('centerId', authUser.centerId);

    if (search) {
      query = query.or(`firstName.ilike.%${search}%,lastName.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await query
      .order(sortBy, { ascending: order })
      .range(from, to);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    const formattedData = (data || []).map((item: any) => {
      const sanitized = { ...item };
      delete sanitized.password;
      return {
        ...sanitized,
        _count: {
          groups: item.groups ? item.groups[0]?.count || 0 : 0,
        },
      };
    });

    return NextResponse.json({
      data: formattedData,
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
    const { firstName, lastName, phone, passportSeries, salaryType, salaryValue, status, login, password } = body;

    const supabase = createServerSupabaseClient();

    // Check login uniqueness if provided
    let trimmedLogin = (login || '').trim();
    let hashedPassword: string | null = null;

    if (trimmedLogin) {
      // Check in teachers table
      const { data: existingTeacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('login', trimmedLogin)
        .maybeSingle();

      if (existingTeacher) {
        return NextResponse.json(
          { message: 'Bu login boshqa o\'qituvchi tomonidan band qilingan' },
          { status: 400 }
        );
      }

      // Check in users table
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', trimmedLogin)
        .maybeSingle();

      if (existingUser) {
        return NextResponse.json(
          { message: 'Bu login tizimda allaqachon mavjud' },
          { status: 400 }
        );
      }
    }

    if (password && password.trim()) {
      const bcrypt = await import('bcryptjs');
      hashedPassword = await bcrypt.default.hash(password.trim(), 10);
    }

    const id = crypto.randomUUID();

    const insertPayload: any = {
      id,
      firstName,
      lastName,
      phone,
      passportSeries: passportSeries || null,
      salaryType: salaryType || 'FIXED',
      salaryValue: Number(salaryValue) || 0,
      status: status || 'FAOL',
      centerId: authUser.centerId,
      updatedAt: new Date().toISOString(),
    };

    if (trimmedLogin) {
      insertPayload.login = trimmedLogin;
    }
    if (hashedPassword) {
      insertPayload.password = hashedPassword;
    }

    const { data, error } = await supabase
      .from('teachers')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    const result = { ...data };
    delete result.password;

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
