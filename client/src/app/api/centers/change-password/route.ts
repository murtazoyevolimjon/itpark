import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function PATCH(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: "Avtorizatsiyadan o'tilmagan" }, { status: 401 });
    }

    const { oldPassword, newPassword } = await req.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ message: "Eski va yangi parolni kiriting" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ message: "Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    if (authUser.role === 'TEACHER') {
      const { data: teacher, error } = await supabase
        .from('teachers')
        .select('id, password')
        .eq('id', authUser.sub)
        .maybeSingle();

      if (error || !teacher) {
        return NextResponse.json({ message: "O'qituvchi topilmadi" }, { status: 404 });
      }

      if (teacher.password) {
        const isMatch = await bcrypt.compare(oldPassword, teacher.password);
        if (!isMatch) {
          return NextResponse.json({ message: "Eski parol noto'g'ri kiritildi" }, { status: 400 });
        }
      }

      const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);
      const { error: updateErr } = await supabase
        .from('teachers')
        .update({ password: hashedPassword })
        .eq('id', authUser.sub);

      if (updateErr) {
        return NextResponse.json({ message: updateErr.message }, { status: 500 });
      }

      return NextResponse.json({ message: "Parol muvaffaqiyatli o'zgartirildi" });
    }

    // Owner / Admin
    const { data: userRecord, error } = await supabase
      .from('users')
      .select('id, password')
      .eq('id', authUser.sub)
      .maybeSingle();

    if (error || !userRecord) {
      return NextResponse.json({ message: "Foydalanuvchi topilmadi" }, { status: 404 });
    }

    if (userRecord.password) {
      const isMatch = await bcrypt.compare(oldPassword, userRecord.password);
      if (!isMatch) {
        return NextResponse.json({ message: "Eski parol noto'g'ri kiritildi" }, { status: 400 });
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);
    const { error: updateErr } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', authUser.sub);

    if (updateErr) {
      return NextResponse.json({ message: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Parol muvaffaqiyatli o'zgartirildi" });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Server xatosi" }, { status: 500 });
  }
}
