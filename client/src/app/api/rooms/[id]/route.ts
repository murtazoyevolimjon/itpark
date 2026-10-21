import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { dbErrorResponse } from '@/lib/dbErrors';
import { firstError, numberValue, text } from '@/lib/validation';

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
      .from('rooms')
      .select('*')
      .eq('id', params.id)
      .eq('centerId', authUser.centerId)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ message: 'Xona topilmadi' }, { status: 404 });
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
      body.name !== undefined ? text(body.name, 'Xona nomi', 100) : null,
      body.number !== undefined ? text(String(body.number ?? ''), 'Xona raqami', 20) : null,
      body.floor !== undefined ? numberValue(body.floor, 'Qavat', { min: 0, max: 200, integer: true }) : null,
      body.capacity !== undefined ? numberValue(body.capacity, "Xona sig'imi", { min: 1, max: 10000, integer: true }) : null
    );
    if (inputError) {
      return NextResponse.json({ message: inputError }, { status: 400 });
    }

    // The room cannot shrink below the largest group already using it
    if (body.capacity !== undefined) {
      const { data: roomGroups } = await supabase
        .from('groups')
        .select('name, studentGroups:student_groups(id)')
        .eq('roomId', params.id)
        .eq('centerId', authUser.centerId)
        .eq('status', 'FAOL');
      const biggest = (roomGroups || []).reduce(
        (max: { name: string; size: number }, g: any) =>
          (g.studentGroups?.length || 0) > max.size ? { name: g.name, size: g.studentGroups.length } : max,
        { name: '', size: 0 }
      );
      if (biggest.size > Number(body.capacity)) {
        return NextResponse.json(
          {
            message: `"${biggest.name}" guruhida ${biggest.size} ta talaba bor, sig'imni ${body.capacity} ga kamaytirib bo'lmaydi.`,
          },
          { status: 409 }
        );
      }
    }

    const updatePayload: any = { updatedAt: new Date().toISOString() };
    if (body.name !== undefined) updatePayload.name = String(body.name).trim();
    if (body.floor !== undefined) updatePayload.floor = Number(body.floor);
    if (body.number !== undefined) updatePayload.number = String(body.number);
    if (body.capacity !== undefined) updatePayload.capacity = Number(body.capacity);

    const { data, error } = await supabase
      .from('rooms')
      .update(updatePayload)
      .eq('id', params.id)
      .eq('centerId', authUser.centerId)
      .select()
      .single();

    if (error) {
      return dbErrorResponse(error);
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

    // Deleting a room cascades to the groups held in it.
    const { count: groupCount } = await supabase
      .from('groups')
      .select('id', { count: 'exact', head: true })
      .eq('roomId', params.id)
      .eq('centerId', authUser.centerId);
    if ((groupCount || 0) > 0) {
      return NextResponse.json(
        { message: `Bu xonada ${groupCount} ta guruh bor. Avval guruhlarni boshqa xonaga o'tkazing.` },
        { status: 409 }
      );
    }

    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', params.id)
      .eq('centerId', authUser.centerId);

    if (error) {
      return dbErrorResponse(error);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
