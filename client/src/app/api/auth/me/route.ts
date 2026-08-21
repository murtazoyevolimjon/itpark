import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser, signToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();

    const { data: userRecord, error } = await supabase
      .from('users')
      .select('id, fullName, email, role, centerId')
      .eq('id', authUser.sub)
      .maybeSingle();

    if (error || !userRecord) {
      return NextResponse.json({ message: 'Foydalanuvchi topilmadi' }, { status: 404 });
    }

    const { data: centerRecord } = await supabase
      .from('centers')
      .select('id, name, email, phone')
      .eq('id', userRecord.centerId)
      .maybeSingle();

    return NextResponse.json({
      ...userRecord,
      center: centerRecord || { name: 'IT-Park Academy' },
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Server xatosi' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: 'Yaroqsiz token' }, { status: 401 });
    }

    const tokens = signToken({
      sub: authUser.sub,
      email: authUser.email,
      role: authUser.role,
      centerId: authUser.centerId,
    });

    return NextResponse.json(tokens);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
