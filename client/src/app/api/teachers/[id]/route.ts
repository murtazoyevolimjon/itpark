import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import {
  parseTeacherCreds,
  serializeTeacherCreds,
  checkLoginUniqueness,
} from '@/lib/credentials';

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

    const { password: plainPassword, passportSeries: cleanPassport } = parseTeacherCreds(data.passportSeries);

    const sanitized = {
      ...data,
      password: plainPassword || (data.password ? '******' : ''),
      passportSeries: cleanPassport || null,
    };

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

    // Fetch existing teacher
    const { data: currentTeacher, error: fetchErr } = await supabase
      .from('teachers')
      .select('*')
      .eq('id', params.id)
      .eq('centerId', authUser.centerId)
      .maybeSingle();

    if (fetchErr || !currentTeacher) {
      return NextResponse.json({ message: 'O\'qituvchi topilmadi' }, { status: 404 });
    }

    const existingCreds = parseTeacherCreds(currentTeacher.passportSeries);

    const updatePayload: any = { updatedAt: new Date().toISOString() };
    if (body.firstName !== undefined) updatePayload.firstName = body.firstName;
    if (body.lastName !== undefined) updatePayload.lastName = body.lastName;
    if (body.phone !== undefined) updatePayload.phone = body.phone;
    if (body.salaryType !== undefined) updatePayload.salaryType = body.salaryType;
    if (body.salaryValue !== undefined) updatePayload.salaryValue = Number(body.salaryValue);
    if (body.status !== undefined) updatePayload.status = body.status;

    if (body.login !== undefined) {
      const trimmedLogin = (body.login || '').trim().toLowerCase();
      if (trimmedLogin) {
        if (trimmedLogin !== (currentTeacher.login || '').toLowerCase()) {
          const uniquenessCheck = await checkLoginUniqueness(supabase, trimmedLogin, {
            type: 'teacher',
            id: params.id,
          });
          if (!uniquenessCheck.available) {
            return NextResponse.json(
              { message: uniquenessCheck.conflictMessage || 'Bu login tizimda allaqachon mavjud' },
              { status: 400 }
            );
          }
        }
        updatePayload.login = trimmedLogin;
      } else {
        updatePayload.login = null;
      }
    }

    let targetPassword = existingCreds.password;
    if (body.password !== undefined && body.password.trim()) {
      targetPassword = body.password.trim();
      const bcrypt = await import('bcryptjs');
      updatePayload.password = await bcrypt.default.hash(targetPassword, 10);
    }

    const targetPassport = body.passportSeries !== undefined ? (body.passportSeries || '').trim() : existingCreds.passportSeries;
    updatePayload.passportSeries = serializeTeacherCreds(targetPassword, targetPassport);

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

    return NextResponse.json({
      ...data,
      password: targetPassword,
      passportSeries: targetPassport || null,
    });
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
