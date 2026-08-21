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
    const { name, phone } = body;

    const supabase = createServerSupabaseClient();
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
