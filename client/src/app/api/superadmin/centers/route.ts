import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getSuperAdminAuth } from '@/lib/superadminAuth';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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
      .select('id, name, email, phone, password, registeredAt, createdAt')
      .order('createdAt', { ascending: false });

    if (centersError) {
      return NextResponse.json({ message: centersError.message }, { status: 500 });
    }

    // 2. Fetch all users to map admin logins and names
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, fullName, email, role, centerId');

    // 3. Fetch counts for each center
    const centersWithStats = await Promise.all(
      (centers || []).map(async (center) => {
        const centerUsers = (allUsers || []).filter((u) => u.centerId === center.id);
        const ownerUser =
          centerUsers.find((u) => u.role === 'OWNER') ||
          centerUsers[0] || {
            fullName: center.name,
            email: center.email,
          };

        const [
          { count: studentsCount },
          { count: groupsCount },
          { count: teachersCount },
          { data: paymentsData },
        ] = await Promise.all([
          supabase.from('students').select('*', { count: 'exact', head: true }).eq('centerId', center.id),
          supabase.from('groups').select('*', { count: 'exact', head: true }).eq('centerId', center.id),
          supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('centerId', center.id),
          supabase.from('payments').select('amount').eq('centerId', center.id),
        ]);

        const totalRevenue = (paymentsData || []).reduce(
          (sum: number, p: any) => sum + (Number(p.amount) || 0),
          0
        );

        let adminPassword = center.password || '';
        if (adminPassword.startsWith('$2a$') || adminPassword.startsWith('$2b$')) {
          if (center.id === 'f05c31e9-58dd-481e-8f4f-eb2979982cb1' || center.email === 'ITPARK_itpark') {
            adminPassword = 'qwerty321';
          } else {
            adminPassword = '';
          }
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
          studentsCount: studentsCount || 0,
          groupsCount: groupsCount || 0,
          teachersCount: teachersCount || 0,
          totalRevenue,
          isMainCenter: center.id === 'f05c31e9-58dd-481e-8f4f-eb2979982cb1' || center.email === 'ITPARK_itpark',
        };
      })
    );

    return NextResponse.json({ centers: centersWithStats });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
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

    const supabase = createServerSupabaseClient();

    // Check if login already exists in users or centers
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email')
      .ilike('email', login)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { message: `"${login}" logini allaqachon mavjud! Boshqa login tanlang.` },
        { status: 400 }
      );
    }

    const { data: existingCenter } = await supabase
      .from('centers')
      .select('id, email')
      .ilike('email', login)
      .maybeSingle();

    if (existingCenter) {
      return NextResponse.json(
        { message: `"${login}" logini allaqachon biriktirilgan! Boshqa login tanlang.` },
        { status: 400 }
      );
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
      return NextResponse.json({ message: centerError.message }, { status: 500 });
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
      return NextResponse.json({ message: userError.message }, { status: 500 });
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
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
