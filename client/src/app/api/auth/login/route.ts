import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email va parolni kiriting' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Auto-seed if database is freshly empty
    if (email === 'admin@itpark.uz') {
      const { seedSupabaseIfNeeded } = await import('@/lib/seed');
      await seedSupabaseIfNeeded();
    }

    // Fetch user
    const { data: userRecord, error } = await supabase
      .from('users')
      .select('id, fullName, email, password, role, centerId')
      .eq('email', email)
      .maybeSingle();

    if (error || !userRecord) {
      return NextResponse.json(
        { message: "Email yoki parol noto'g'ri" },
        { status: 401 }
      );
    }

    const isMatch = await bcrypt.compare(password, userRecord.password);
    if (!isMatch) {
      return NextResponse.json(
        { message: "Email yoki parol noto'g'ri" },
        { status: 401 }
      );
    }

    // Fetch center name
    const { data: centerRecord } = await supabase
      .from('centers')
      .select('name')
      .eq('id', userRecord.centerId)
      .maybeSingle();

    const tokens = signToken({
      sub: userRecord.id,
      email: userRecord.email,
      role: userRecord.role,
      centerId: userRecord.centerId,
    });

    const user = {
      id: userRecord.id,
      fullName: userRecord.fullName,
      email: userRecord.email,
      role: userRecord.role,
      centerId: userRecord.centerId,
      centerName: centerRecord?.name || 'IT-Park Academy',
    };

    return NextResponse.json({ tokens, user });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Serverda xatolik yuz berdi' },
      { status: 500 }
    );
  }
}
