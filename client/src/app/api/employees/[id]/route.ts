import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/lib/dbErrors';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { ENUMS, date, firstError, numberValue, oneOf, phone as phoneRule, text } from '@/lib/validation';

export async function GET(
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
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', params.id)
      .eq('centerId', authUser.centerId)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ message: 'Xodim topilmadi' }, { status: 404 });
    }

    return NextResponse.json(data);
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

    const inputError = firstError(
      body.firstName !== undefined ? text(body.firstName, 'Ism', 60) : null,
      body.lastName !== undefined ? text(body.lastName, 'Familiya', 60) : null,
      body.phone !== undefined ? phoneRule(body.phone, 'Telefon raqam') : null,
      body.position !== undefined ? text(body.position, 'Lavozim', 100) : null,
      body.salary !== undefined ? numberValue(body.salary, 'Oylik', { min: 0, max: 1_000_000_000_000 }) : null,
      body.status !== undefined ? oneOf(body.status, ENUMS.activeStatus, 'Holat') : null,
      body.hiredAt !== undefined ? date(body.hiredAt, 'Ishga olingan sana') : null
    );
    if (inputError) {
      return NextResponse.json({ message: inputError }, { status: 400 });
    }

    const updatePayload: any = { updatedAt: new Date().toISOString() };
    if (body.firstName !== undefined) updatePayload.firstName = body.firstName;
    if (body.lastName !== undefined) updatePayload.lastName = body.lastName;
    if (body.phone !== undefined) updatePayload.phone = body.phone;
    if (body.position !== undefined) updatePayload.position = body.position;
    if (body.salary !== undefined) updatePayload.salary = Number(body.salary);
    if (body.status !== undefined) updatePayload.status = body.status;
    if (body.hiredAt !== undefined) updatePayload.hiredAt = new Date(body.hiredAt).toISOString();

    const { data, error } = await supabase
      .from('employees')
      .update(updatePayload)
      .eq('id', params.id)
      .eq('centerId', authUser.centerId)
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
    const { error } = await supabase
      .from('employees')
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
