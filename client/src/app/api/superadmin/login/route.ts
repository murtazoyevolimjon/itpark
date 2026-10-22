import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/lib/dbErrors';
import bcrypt from 'bcryptjs';
import { signSuperAdminToken } from '@/lib/superadminAuth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { timingSafeEqual } from 'crypto';
import { getClientIp, isRateLimited } from '@/lib/rateLimit';

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const login = (body.login || '').trim();
    const password = (body.password || '').trim();

    if (!login || !password) {
      return NextResponse.json(
        { message: 'Dasturchi logini va parolini kiriting' },
        { status: 400 }
      );
    }

    if (isRateLimited(`sa-login:${getClientIp(req)}`, 5)) {
      return NextResponse.json(
        { message: "Juda ko'p urinish. Birozdan keyin qayta urinib ko'ring" },
        { status: 429 }
      );
    }

    const envLogin =(process.env.SUPERADMIN_LOGIN || '').trim().toLowerCase();
    const envPassword = (process.env.SUPERADMIN_PASSWORD || '').trim();

    // Env-based superadmin is enabled only when both values are configured.
    let isAuthorized =
      !!envLogin &&
      !!envPassword &&
      login.toLowerCase() === envLogin &&
      safeEqual(password, envPassword);

    // Also check database if there's a registered SUPERADMIN role
    if (!isAuthorized) {
      const supabase = createServerSupabaseClient();
      const { data: dbUser } = await supabase
        .from('users')
        .select('*')
        .ilike('email', login)
        .maybeSingle();

      if (dbUser && dbUser.role === 'SUPERADMIN') {
        const passValid = await bcrypt.compare(password, dbUser.password);
        if (passValid) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { message: "Dasturchi logini yoki paroli noto'g'ri" },
        { status: 401 }
      );
    }

    const token = signSuperAdminToken({
      sub: 'superadmin-developer',
      login: login,
      role: 'SUPERADMIN',
      fullName: 'Bosh Dasturchi',
    });

    return NextResponse.json({
      token,
      user: {
        role: 'SUPERADMIN',
        fullName: 'Bosh Dasturchi',
        login: login,
      },
    });
  } catch (error: any) {
    return serverErrorResponse(error);
  }
}
