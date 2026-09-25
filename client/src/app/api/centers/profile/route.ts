import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();

    if (authUser.role === 'TEACHER') {
      const { data: teacher, error: tErr } = await supabase
        .from('teachers')
        .select('id, firstName, lastName, phone, login, centerId, status, createdAt')
        .eq('id', authUser.sub)
        .maybeSingle();

      if (tErr || !teacher) {
        return NextResponse.json({ message: "O'qituvchi topilmadi" }, { status: 404 });
      }

      const { data: center } = await supabase
        .from('centers')
        .select('id, name, phone')
        .eq('id', teacher.centerId)
        .maybeSingle();

      return NextResponse.json({
        id: teacher.id,
        isTeacher: true,
        name: `${teacher.firstName} ${teacher.lastName}`.trim(),
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        phone: teacher.phone || '',
        login: teacher.login || teacher.phone || '',
        centerName: center?.name || 'IT Park',
        centerPhone: center?.phone || '',
        status: teacher.status || 'FAOL',
        registeredAt: teacher.createdAt,
        // Markaz logini / emaili o'qituvchiga umuman yuborilmaydi
      });
    }

    const { data: center, error } = await supabase
      .from('centers')
      .select('id, name, email, phone, registeredAt')
      .eq('id', authUser.centerId)
      .maybeSingle();

    if (error || !center) {
      return NextResponse.json({ message: 'Markaz topilmadi' }, { status: 404 });
    }

    return NextResponse.json(center);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 });
    }

    const body = await req.json();
    const supabase = createServerSupabaseClient();

    if (authUser.role === 'TEACHER') {
      const updatePayload: any = {};
      if (body.phone !== undefined) updatePayload.phone = body.phone;
      if (body.firstName !== undefined) updatePayload.firstName = body.firstName;
      if (body.lastName !== undefined) updatePayload.lastName = body.lastName;

      const { data, error } = await supabase
        .from('teachers')
        .update(updatePayload)
        .eq('id', authUser.sub)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ message: error.message }, { status: 500 });
      }

      return NextResponse.json(data);
    }

    const { name, phone } = body;

    const { data, error } = await supabase
      .from('centers')
      .update({ name, phone, updatedAt: new Date().toISOString() })
      .eq('id', authUser.centerId)
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
