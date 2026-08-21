import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, password } = body;

    if (!name || !email || !phone || !password) {
      return NextResponse.json(
        { message: "Barcha maydonlarni to'ldiring" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Check if email exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { message: "Bu email bilan ro'yxatdan o'tilgan" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const centerId = crypto.randomUUID();
    const userId = crypto.randomUUID();

    // Create Center
    const { error: centerError } = await supabase.from('centers').insert({
      id: centerId,
      name,
      email,
      phone,
      password: hashedPassword,
    });

    if (centerError) {
      return NextResponse.json(
        { message: centerError.message },
        { status: 500 }
      );
    }

    // Create User (Owner)
    const { error: userError } = await supabase.from('users').insert({
      id: userId,
      fullName: name,
      email,
      password: hashedPassword,
      role: 'OWNER',
      centerId,
    });

    if (userError) {
      return NextResponse.json(
        { message: userError.message },
        { status: 500 }
      );
    }

    const tokens = signToken({
      sub: userId,
      email,
      role: 'OWNER',
      centerId,
    });

    const user = {
      id: userId,
      fullName: name,
      email,
      role: 'OWNER',
      centerId,
      centerName: name,
    };

    return NextResponse.json({ tokens, user });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Serverda xatolik yuz berdi' },
      { status: 500 }
    );
  }
}
