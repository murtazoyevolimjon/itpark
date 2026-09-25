import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('teachers')
      .select('*, groups(*)')
      .eq('id', params.id)
      .eq('centerId', authUser.centerId)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ message: 'O\'qituvchi topilmadi' }, { status: 404 });
    }

    const sanitized = { ...data };
    delete sanitized.password;

    return NextResponse.json(sanitized);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 });
    }

    const body = await req.json();
    const supabase = createServerSupabaseClient();

    const updatePayload: any = { updatedAt: new Date().toISOString() };
    if (body.firstName !== undefined) updatePayload.firstName = body.firstName;
    if (body.lastName !== undefined) updatePayload.lastName = body.lastName;
    if (body.phone !== undefined) updatePayload.phone = body.phone;
    if (body.passportSeries !== undefined) updatePayload.passportSeries = body.passportSeries;
    if (body.salaryType !== undefined) updatePayload.salaryType = body.salaryType;
    if (body.salaryValue !== undefined) updatePayload.salaryValue = Number(body.salaryValue);
    if (body.status !== undefined) updatePayload.status = body.status;

    if (body.login !== undefined) {
      const trimmedLogin = (body.login || '').trim();
      if (trimmedLogin) {
        // Check uniqueness in teachers
        const { data: existingTeacher } = await supabase
          .from('teachers')
          .select('id')
          .eq('login', trimmedLogin)
          .neq('id', params.id)
          .maybeSingle();

        if (existingTeacher) {
          return NextResponse.json(
            { message: 'Bu login boshqa o\'qituvchi tomonidan band qilingan' },
            { status: 400 }
          );
        }

        // Check uniqueness in users
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

        updatePayload.login = trimmedLogin;
      } else {
        updatePayload.login = null;
      }
    }

    if (body.password !== undefined && body.password.trim()) {
      const bcrypt = await import('bcryptjs');
      updatePayload.password = await bcrypt.default.hash(body.password.trim(), 10);
    }

    const { data, error } = await supabase
      .from('teachers')
      .update(updatePayload)
      .eq('id', params.id)
      .eq('centerId', authUser.centerId)
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from('teachers')
      .delete()
      .eq('id', params.id)
      .eq('centerId', authUser.centerId);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
