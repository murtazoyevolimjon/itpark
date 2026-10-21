import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { dbErrorResponse } from '@/lib/dbErrors';
import { firstError, numberValue, optionalText, text } from '@/lib/validation';

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
      .from('courses')
      .select('*')
      .eq('id', params.id)
      .eq('centerId', authUser.centerId)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ message: 'Kurs topilmadi' }, { status: 404 });
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
      body.name !== undefined ? text(body.name, 'Kurs nomi', 100) : null,
      body.price !== undefined ? numberValue(body.price, 'Kurs narxi', { min: 0, max: 1_000_000_000 }) : null,
      optionalText(body.description, 'Izoh', 1000)
    );
    if (inputError) {
      return NextResponse.json({ message: inputError }, { status: 400 });
    }

    const updatePayload: any = { updatedAt: new Date().toISOString() };
    if (body.name !== undefined) updatePayload.name = String(body.name).trim();
    if (body.price !== undefined) updatePayload.price = Number(body.price);
    if (body.description !== undefined) updatePayload.description = body.description;
    if (body.isActive !== undefined) updatePayload.isActive = body.isActive;

    const { data, error } = await supabase
      .from('courses')
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

    // Deleting a course cascades to all of its groups (and their attendance), so it must be unused.
    const { count: groupCount } = await supabase
      .from('groups')
      .select('id', { count: 'exact', head: true })
      .eq('courseId', params.id)
      .eq('centerId', authUser.centerId);
    if ((groupCount || 0) > 0) {
      return NextResponse.json(
        {
          message: `Bu kursda ${groupCount} ta guruh bor. Avval guruhlarni o'chiring yoki boshqa kursga o'tkazing. Kursni yashirish uchun uni "nofaol" qiling.`,
        },
        { status: 409 }
      );
    }

    const { error } = await supabase
      .from('courses')
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
