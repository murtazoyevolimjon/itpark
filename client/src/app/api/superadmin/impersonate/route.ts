import { NextRequest, NextResponse } from 'next/server';
import { getSuperAdminAuth } from '@/lib/superadminAuth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const auth = getSuperAdminAuth(req);
    if (!auth) {
      return NextResponse.json({ message: "Dasturchi ruxsati yo'q" }, { status: 401 });
    }

    const body = await req.json();
    const { centerId } = body;

    if (!centerId) {
      return NextResponse.json({ message: 'Markaz ID ko\'rsatilmadi' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // 1. Fetch center
    const { data: center, error: centerError } = await supabase
      .from('centers')
      .select('id, name, email')
      .eq('id', centerId)
      .maybeSingle();

    if (centerError || !center) {
      return NextResponse.json({ message: 'Markaz topilmadi' }, { status: 404 });
    }

    // 2. Fetch center user (OWNER)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, fullName, email, role, centerId')
      .eq('centerId', centerId)
      .maybeSingle();

    if (userError || !user) {
      return NextResponse.json({ message: 'Markaz administratori topilmadi' }, { status: 404 });
    }

    // 3. Sign token for standard CRM session
    const tokens = signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      centerId: user.centerId,
    });

    const userPayload = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      centerId: user.centerId,
      centerName: center.name,
    };

    return NextResponse.json({
      tokens,
      user: userPayload,
      centerName: center.name,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
