import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: "Avtorizatsiyadan o'tilmagan" }, { status: 401 });
    }

    const body = await req.json();
    const { groupId, date, records } = body;

    if (!groupId || !date || !Array.isArray(records)) {
      return NextResponse.json({ message: "Noto'g'ri ma'lumotlar" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const cleanDate = date.split('T')[0];
    const startOfDay = `${cleanDate}T00:00:00.000Z`;
    const endOfDay = `${cleanDate}T23:59:59.999Z`;

    const isTeacher = authUser.role === 'TEACHER';

    // Verify teacher owns this group
    if (isTeacher) {
      const { data: grp } = await supabase
        .from('groups')
        .select('id, teacherId')
        .eq('id', groupId)
        .eq('centerId', authUser.centerId)
        .maybeSingle();

      if (!grp || grp.teacherId !== authUser.sub) {
        return NextResponse.json(
          { message: "Siz faqat o'zingizning guruhingizga davomat ola olasiz" },
          { status: 403 }
        );
      }
    }

    for (const rec of records) {
      // Find existing attendance record for that student, group and date
      const { data: existing } = await supabase
        .from('attendances')
        .select('id, status, note')
        .eq('studentId', rec.studentId)
        .eq('groupId', groupId)
        .gte('date', startOfDay)
        .lte('date', endOfDay)
        .maybeSingle();

      if (existing) {
        if (isTeacher) {
          // O'qituvchi saqlangan davomatni qayta ololmaydi.
          // Yagona ruxsat: Agar o'quvchi avval "KELMAGAN" bo'lsa, darsga kelsa uni "KECHIKKAN" deb sababini yozish mumkin.
          if (existing.status === 'KELMAGAN' && rec.status === 'KECHIKKAN') {
            if (!rec.note || !rec.note.trim()) {
              return NextResponse.json(
                { message: "Kechikib kelgan o'quvchi uchun kechikish sababini yozish majburiy!" },
                { status: 400 }
              );
            }
            await supabase
              .from('attendances')
              .update({
                status: 'KECHIKKAN',
                note: rec.note.trim(),
                updatedAt: new Date().toISOString(),
              })
              .eq('id', existing.id);
          }
          // Agar o'quvchi KELGAN yoki KECHIKKAN bo'lsa, o'qituvchi o'zgartira olmaydi
          continue;
        } else {
          // Admin / Owner ixtiyoriy o'zgartira oladi
          await supabase
            .from('attendances')
            .update({
              status: rec.status,
              note: rec.note !== undefined ? (rec.note || null) : null,
              updatedAt: new Date().toISOString(),
            })
            .eq('id', existing.id);
        }
      } else {
        // Yangi davomat yozuvi yaratish (birinchi marta olish)
        await supabase.from('attendances').insert({
          id: crypto.randomUUID(),
          studentId: rec.studentId,
          groupId,
          date: startOfDay,
          status: rec.status,
          note: rec.note || null,
          centerId: authUser.centerId,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({ success: true, count: records.length });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
