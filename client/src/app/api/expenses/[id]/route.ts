import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { ENUMS, date, firstError, money, oneOf, optionalText } from '@/lib/validation';

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
      .from('expenses')
      .select('*')
      .eq('id', params.id)
      .eq('centerId', authUser.centerId)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ message: 'Xarajat topilmadi' }, { status: 404 });
    }

    return NextResponse.json(data);
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
    if (authUser.role === 'TEACHER' || authUser.role === 'STUDENT') {
      return NextResponse.json({ message: "Ruxsat yo'q" }, { status: 403 });
    }

    const body = await req.json();
    const supabase = createServerSupabaseClient();

    const inputError = firstError(
      body.amount !== undefined ? money(body.amount, 'Summa') : null,
      body.type !== undefined ? oneOf(body.type, ENUMS.expenseType, 'Xarajat turi') : null,
      body.status !== undefined ? oneOf(body.status, ENUMS.expenseStatus, 'Holat') : null,
      body.date !== undefined ? date(body.date, 'Sana') : null,
      optionalText(body.note, 'Izoh', 1000),
      optionalText(body.ownerName, 'Ism', 120)
    );
    if (inputError) {
      return NextResponse.json({ message: inputError }, { status: 400 });
    }

    const updatePayload: any = { updatedAt: new Date().toISOString() };
    if (body.amount !== undefined) updatePayload.amount = Number(body.amount);
    if (body.type !== undefined) updatePayload.type = body.type;
    if (body.ownerName !== undefined) updatePayload.ownerName = body.ownerName;
    if (body.status !== undefined) updatePayload.status = body.status;
    if (body.note !== undefined) updatePayload.note = body.note;
    if (body.date !== undefined) updatePayload.date = new Date(body.date).toISOString();

    const { data, error } = await supabase
      .from('expenses')
      .update(updatePayload)
      .eq('id', params.id)
      .eq('centerId', authUser.centerId)
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
      .from('expenses')
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
