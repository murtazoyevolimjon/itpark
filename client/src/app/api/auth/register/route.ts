import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/lib/dbErrors';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    // Centers are created by the developer (superadmin panel). Open self-registration stays off
    // unless ALLOW_PUBLIC_REGISTRATION=true is set explicitly.
    if (process.env.ALLOW_PUBLIC_REGISTRATION !== 'true') {
      return NextResponse.json(
        { message: "Ro'yxatdan o'tish yopiq. O'quv markaz ochish uchun dasturchiga murojaat qiling." },
        { status: 403 }
      );
    }

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
      return serverErrorResponse(centerError);
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
      return serverErrorResponse(userError);
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
    return serverErrorResponse(error);
  }
}
