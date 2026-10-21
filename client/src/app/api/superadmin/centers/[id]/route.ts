import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSuperAdminAuth } from '@/lib/superadminAuth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { findLoginConflict, validateCenterInput } from '@/lib/centerRules';

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
    const { name, phone, adminName, newPassword, login } = body;

    const inputError = validateCenterInput({
      name: typeof name === 'string' && name.trim() ? name : undefined,
      adminName: typeof adminName === 'string' ? adminName : undefined,
      phone: typeof phone === 'string' ? phone : undefined,
      password: typeof newPassword === 'string' && newPassword.trim() ? newPassword.trim() : undefined,
      login: typeof login === 'string' && login.trim() ? login : undefined,
    });
    if (inputError) {
      return NextResponse.json({ message: inputError }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const { data: existingCenter } = await supabase.from('centers').select('id, email').eq('id', id).maybeSingle();
    if (!existingCenter) {
      return NextResponse.json({ message: 'Markaz topilmadi' }, { status: 404 });
    }

    const updateCenterData: any = {
      updatedAt: new Date().toISOString(),
    };
    if (name) updateCenterData.name = name.trim();
    if (phone) updateCenterData.phone = phone.trim();

    // Changing the login: must stay unique and is applied to the center record AND its owner account
    const nextLogin = typeof login === 'string' ? login.trim() : '';
    if (nextLogin && nextLogin.toLowerCase() !== (existingCenter.email || '').toLowerCase()) {
      const taken = await findLoginConflict(supabase, nextLogin, { centerId: id });
      if (taken) {
        return NextResponse.json({ message: taken }, { status: 400 });
      }
      updateCenterData.email = nextLogin;
      const { error: loginErr } = await supabase
        .from('users')
        .update({ email: nextLogin, updatedAt: new Date().toISOString() })
        .eq('centerId', id)
        .eq('role', 'OWNER');
      if (loginErr) {
        return NextResponse.json({ message: loginErr.message }, { status: 500 });
      }
    }

    if (newPassword && newPassword.trim()) {
      const plainPass = newPassword.trim();
      const hashedPassword = await bcrypt.hash(plainPass, 10);
      updateCenterData.password = plainPass;

      // The owner account(s) of this center get the new password
      await supabase
        .from('users')
        .update({ password: hashedPassword, updatedAt: new Date().toISOString() })
        .eq('centerId', id)
        .eq('role', 'OWNER');
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

    if (!center) {
      return NextResponse.json({ message: 'Markaz topilmadi' }, { status: 404 });
    }

    // Everything of the center (students, groups, payments...) is erased: require the typed name
    const body = await req.json().catch(() => ({}));
    const typedName = typeof body?.confirmName === 'string' ? body.confirmName.trim().toLowerCase() : '';
    if (typedName !== (center.name || '').trim().toLowerCase()) {
      return NextResponse.json(
        { message: "O'chirishni tasdiqlash uchun markaz nomini aynan yozing" },
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
