import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSuperAdminAuth } from '@/lib/superadminAuth';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getSuperAdminAuth(req);
    if (!auth) {
      return NextResponse.json({ message: "Dasturchi ruxsati yo'q" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createServerSupabaseClient();

    const { data: center, error } = await supabase
      .from('centers')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !center) {
      return NextResponse.json({ message: 'Markaz topilmadi' }, { status: 404 });
    }

    const { data: users } = await supabase
      .from('users')
      .select('id, fullName, email, role')
      .eq('centerId', id);

    return NextResponse.json({ center, users });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getSuperAdminAuth(req);
    if (!auth) {
      return NextResponse.json({ message: "Dasturchi ruxsati yo'q" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, phone, adminName, newPassword } = body;

    const supabase = createServerSupabaseClient();

    const updateCenterData: any = {
      updatedAt: new Date().toISOString(),
    };
    if (name) updateCenterData.name = name.trim();
    if (phone) updateCenterData.phone = phone.trim();

    if (newPassword && newPassword.trim()) {
      const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);
      updateCenterData.password = hashedPassword;

      // Update password for user(s) in this center
      await supabase
        .from('users')
        .update({ password: hashedPassword, updatedAt: new Date().toISOString() })
        .eq('centerId', id);
    }

    if (Object.keys(updateCenterData).length > 1) {
      const { error: centerUpdateError } = await supabase
        .from('centers')
        .update(updateCenterData)
        .eq('id', id);

      if (centerUpdateError) {
        return NextResponse.json({ message: centerUpdateError.message }, { status: 500 });
      }
    }

    if (adminName && adminName.trim()) {
      await supabase
        .from('users')
        .update({ fullName: adminName.trim(), updatedAt: new Date().toISOString() })
        .eq('centerId', id)
        .eq('role', 'OWNER');
    }

    return NextResponse.json({ success: true, message: "Markaz ma'lumotlari yangilandi" });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getSuperAdminAuth(req);
    if (!auth) {
      return NextResponse.json({ message: "Dasturchi ruxsati yo'q" }, { status: 401 });
    }

    const { id } = await params;

    // Safety checks: Never delete IT-Park main center!
    if (id === 'f05c31e9-58dd-481e-8f4f-eb2979982cb1') {
      return NextResponse.json(
        { message: "IT-Park Academy asosiy markazini o'chirish taqiqlangan!" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data: center } = await supabase
      .from('centers')
      .select('name, email')
      .eq('id', id)
      .maybeSingle();

    if (center && (center.email === 'ITPARK_itpark' || center.name?.toLowerCase().includes('it-park'))) {
      return NextResponse.json(
        { message: "IT-Park Academy asosiy markazini o'chirish taqiqlangan!" },
        { status: 400 }
      );
    }

    // Delete center - Supabase cascading foreign keys will remove associated records
    const { error } = await supabase.from('centers').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Markaz muvaffaqiyatli o'chirildi" });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
