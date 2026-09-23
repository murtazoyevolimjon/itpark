import { NextRequest, NextResponse } from 'next/server';
import { getSuperAdminAuth } from '@/lib/superadminAuth';

export async function GET(req: NextRequest) {
  try {
    const auth = getSuperAdminAuth(req);
    if (!auth) {
      return NextResponse.json({ message: "Dasturchi ruxsati yo'q" }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        role: auth.role,
        fullName: auth.fullName,
        login: auth.login,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
