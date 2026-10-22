import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/lib/dbErrors';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getSuperAdminAuth } from '@/lib/superadminAuth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { findLoginConflict, validateCenterInput } from '@/lib/centerRules';

export async function GET(req: NextRequest) {
  try {
    const auth = getSuperAdminAuth(req);
    if (!auth) {
      return NextResponse.json({ message: "Dasturchi ruxsati yo'q" }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();

    // 1. Fetch all centers
    const { data: centers, error: centersError } = await supabase
      .from('centers')
      .select(
        'id, name, email, phone, password, registeredAt, createdAt, students(count), groups(count), teachers(count), payments(amount)'
      )
      .order('createdAt', { ascending: false });

    if (centersError) {
      return serverErrorResponse(centersError);
    }

    // 2. Fetch all users to map admin logins and names
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, fullName, email, role, centerId');

    // 3. Counts and revenue come embedded with the centers query (no per-center requests)
    const centersWithStats = (centers || []).map((center: any) => {
        const centerUsers = (allUsers || []).filter((u) => u.centerId === center.id);
        const ownerUser =
          centerUsers.find((u) => u.role === 'OWNER') ||
          centerUsers[0] || {
            fullName: center.name,
            email: center.email,
          };

        const studentsCount = center.students?.[0]?.count || 0;
        const groupsCount = center.groups?.[0]?.count || 0;
        const teachersCount = center.teachers?.[0]?.count || 0;

        const totalRevenue = (center.payments || []).reduce(
          (sum: number, p: any) => sum + (Number(p.amount) || 0),
          0
        );

        // Plain text is only known for passwords the developer set; a hash or an owner-changed password shows as empty
        let adminPassword = center.password || '';
        if (adminPassword.startsWith('$2a$') || adminPassword.startsWith('$2b$') || adminPassword.startsWith('$2y$')) {
          adminPassword = '';
        }

        return {
          id: center.id,
          name: center.name,
          email: center.email,
          phone: center.phone,
          registeredAt: center.registeredAt || center.createdAt,
          adminName: ownerUser.fullName,
          adminLogin: ownerUser.email,
          adminPassword: adminPassword,
          studentsCount,
          groupsCount,
          teachersCount,
          totalRevenue,
          isMainCenter: center.id === 'f05c31e9-58dd-481e-8f4f-eb2979982cb1' || center.email === 'ITPARK_itpark',
        };
    });

    return NextResponse.json({ centers: centersWithStats });
  } catch (error: any) {
    return serverErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getSuperAdminAuth(req);
    if (!auth) {
      return NextResponse.json({ message: "Dasturchi ruxsati yo'q" }, { status: 401 });
    }

    const body = await req.json();
    const name = (body.name || '').trim();
    const phone = (body.phone || '').trim();
    const login = (body.login || body.email || '').trim();
    const adminName = (body.adminName || '').trim() || `${name} Rahbari`;
    const password = (body.password || '').trim();

    if (!name || !login || !password) {
      return NextResponse.json(
        { message: "O'quv markaz nomi, login va parol majburiy maydonlar" },
        { status: 400 }
      );
    }

    const inputError = validateCenterInput({ name, login, password, adminName, phone });
    if (inputError) {
      return NextResponse.json({ message: inputError }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const taken = await findLoginConflict(supabase, login);
    if (taken) {
      return NextResponse.json({ message: taken }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const centerId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();

    // 1. Create Center
    const { error: centerError } = await supabase.from('centers').insert({
      id: centerId,
      name,
      email: login,
      phone: phone || '+998',
      password: password,
      registeredAt: now,
      createdAt: now,
      updatedAt: now,
    });

    if (centerError) {
      return serverErrorResponse(centerError);
    }

    // 2. Create Owner User for this Center
    const { error: userError } = await supabase.from('users').insert({
      id: userId,
      fullName: adminName,
      email: login,
      password: hashedPassword,
      role: 'OWNER',
      centerId,
      createdAt: now,
      updatedAt: now,
    });

    if (userError) {
      // Roll back so a half-created center (without an owner) is never left behind
      await supabase.from('centers').delete().eq('id', centerId);
      return serverErrorResponse(userError);
    }

    return NextResponse.json({
      success: true,
      center: {
        id: centerId,
        name,
        email: login,
        phone,
        adminName,
        registeredAt: now,
      },
      credentials: {
        login,
        password,
      },
    });
  } catch (error: any) {
    return serverErrorResponse(error);
  }
}
