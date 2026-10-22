import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { requireStaff } from '@/lib/authz';
import {
  parseTeacherCreds,
  serializeTeacherCreds,
  checkLoginUniqueness,
} from '@/lib/credentials';
import { dbErrorResponse, serverErrorResponse } from '@/lib/dbErrors';
import { ENUMS, firstError, numberValue, oneOf, phone as phoneRule, text } from '@/lib/validation';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 });
    }

    const staffOnly = requireStaff(authUser);
    if (staffOnly) return staffOnly;

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
    return serverErrorResponse(error);
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
    if (authUser.role === 'TEACHER' || authUser.role === 'STUDENT') {
      return NextResponse.json({ message: "Ruxsat yo'q" }, { status: 403 });
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

    const nextSalaryType = body.salaryType !== undefined ? body.salaryType : currentTeacher.salaryType;
    const inputError = firstError(
      body.firstName !== undefined ? text(body.firstName, 'Ism', 60) : null,
      body.lastName !== undefined ? text(body.lastName, 'Familiya', 60) : null,
      body.phone !== undefined ? phoneRule(body.phone, 'Telefon raqam') : null,
      body.salaryType !== undefined ? oneOf(body.salaryType, ENUMS.salaryType, 'Oylik turi') : null,
      body.salaryValue !== undefined ? numberValue(body.salaryValue, 'Oylik', { min: 0, max: 1_000_000_000_000 }) : null,
      nextSalaryType === 'PERCENT' && body.salaryValue !== undefined
        ? numberValue(body.salaryValue, 'Foiz', { min: 0, max: 100 })
        : null,
      body.status !== undefined ? oneOf(body.status, ENUMS.activeStatus, 'Holat') : null,
      body.password !== undefined && typeof body.password !== 'string' ? "Parol noto'g'ri" : null
    );
    if (inputError) {
      return NextResponse.json({ message: inputError }, { status: 400 });
    }

    // Deactivating a teacher who still leads active groups would leave those groups without a teacher
    if (body.status === 'NOFAOL' && currentTeacher.status !== 'NOFAOL') {
      const { count: activeGroups } = await supabase
        .from('groups')
        .select('id', { count: 'exact', head: true })
        .eq('teacherId', params.id)
        .eq('centerId', authUser.centerId)
        .eq('status', 'FAOL');
      if ((activeGroups || 0) > 0) {
        return NextResponse.json(
          { message: `Ustozda ${activeGroups} ta faol guruh bor. Avval guruhlarni boshqa ustozga o'tkazing.` },
          { status: 409 }
        );
      }
    }

    const existingCreds = parseTeacherCreds(currentTeacher.passportSeries);

    const updatePayload: any = { updatedAt: new Date().toISOString() };
    if (body.firstName !== undefined) updatePayload.firstName = String(body.firstName).trim();
    if (body.lastName !== undefined) updatePayload.lastName = String(body.lastName).trim();
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
      return dbErrorResponse(error);
    }

    return NextResponse.json({
      ...data,
      password: targetPassword,
      passportSeries: targetPassport || null,
    });
  } catch (error: any) {
    return serverErrorResponse(error);
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
    if (authUser.role === 'TEACHER' || authUser.role === 'STUDENT') {
      return NextResponse.json({ message: "Ruxsat yo'q" }, { status: 403 });
    }

    const supabase = createServerSupabaseClient();

    // Deleting a teacher cascades to the groups they lead.
    const { count: groupCount } = await supabase
      .from('groups')
      .select('id', { count: 'exact', head: true })
      .eq('teacherId', params.id)
      .eq('centerId', authUser.centerId);
    if ((groupCount || 0) > 0) {
      return NextResponse.json(
        {
          message: `Ustozda ${groupCount} ta guruh bor. Avval guruhlarni boshqa ustozga o'tkazing, so'ng o'chiring. Vaqtincha ishlamasa, holatini "NOFAOL" qiling.`,
        },
        { status: 409 }
      );
    }

    const { error } = await supabase
      .from('teachers')
      .delete()
      .eq('id', params.id)
      .eq('centerId', authUser.centerId);

    if (error) {
      return serverErrorResponse(error);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return serverErrorResponse(error);
  }
}
