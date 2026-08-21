import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 });
    }

    const body = await req.json();
    const { groupId, date, records } = body;

    if (!groupId || !date || !Array.isArray(records)) {
      return NextResponse.json({ message: "Noto'g'ri ma'lumotlar" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const attendanceDate = new Date(date).toISOString();

    for (const rec of records) {
      // Upsert attendance record
      const { data: existing } = await supabase
        .from('attendances')
        .select('id')
        .eq('studentId', rec.studentId)
        .eq('groupId', groupId)
        .eq('date', attendanceDate)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('attendances')
          .update({
            status: rec.status,
            note: rec.note || null,
            updatedAt: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('attendances').insert({
          id: crypto.randomUUID(),
          studentId: rec.studentId,
          groupId,
          date: attendanceDate,
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
