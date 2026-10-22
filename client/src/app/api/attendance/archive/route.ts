import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/lib/dbErrors';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { requireStaff } from '@/lib/authz';
import { getArchivableMonthRange, getAttendanceRetentionCutoff } from '@/lib/attendanceRetention';
import { fetchAll } from '@/lib/pagedFetch';

const unauthorized = () => NextResponse.json({ message: "Avtorizatsiyadan o'tilmagan" }, { status: 401 });

/**
 * Old attendance waits here until the center downloads it.
 *   GET            -> months older than the working window, with record counts
 *   GET ?month=... -> every record of that month (the page builds the Excel and PDF from it)
 *   DELETE ?month= -> deletes that month, called by the page after the files were downloaded
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) return unauthorized();
    const staffOnly = requireStaff(authUser);
    if (staffOnly) return staffOnly;

    const month = new URL(req.url).searchParams.get('month');
    const supabase = createServerSupabaseClient();

    if (!month) {
      const rows = await fetchAll<{ id: string; date: string }>((from, to) =>
        supabase
          .from('attendances')
          .select('id, date')
          .eq('centerId', authUser.centerId)
          .lt('date', getAttendanceRetentionCutoff())
          .order('id')
          .range(from, to)
      );
      const counts: Record<string, number> = {};
      for (const r of rows) {
        const key = String(r.date).slice(0, 7);
        counts[key] = (counts[key] || 0) + 1;
      }
      const months = Object.keys(counts)
        .sort()
        .map((key) => ({ month: key, count: counts[key] }));
      return NextResponse.json({ months });
    }

    const range = getArchivableMonthRange(month);
    if (!range) return NextResponse.json({ message: "Bu oy hali arxivga o'tmagan" }, { status: 400 });

    const rows = await fetchAll<any>((from, to) =>
      supabase
        .from('attendances')
        .select('id, date, status, note, student:students(firstName, lastName, phone), group:groups(name)')
        .eq('centerId', authUser.centerId)
        .gte('date', range.start)
        .lt('date', range.end)
        .order('id')
        .range(from, to)
    );

    const records = rows
      .map((r) => ({
        date: String(r.date).slice(0, 10),
        group: r.group?.name || '-',
        student: `${r.student?.firstName || ''} ${r.student?.lastName || ''}`.trim() || "Noma'lum",
        phone: r.student?.phone || '-',
        status: r.status,
        note: r.note || '',
      }))
      .sort((a, b) => a.date.localeCompare(b.date) || a.group.localeCompare(b.group) || a.student.localeCompare(b.student));

    return NextResponse.json({ month, records });
  } catch (error) {
    return serverErrorResponse(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) return unauthorized();
    const staffOnly = requireStaff(authUser);
    if (staffOnly) return staffOnly;

    const range = getArchivableMonthRange(new URL(req.url).searchParams.get('month') || '');
    if (!range) return NextResponse.json({ message: "Bu oy hali arxivga o'tmagan" }, { status: 400 });

    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from('attendances')
      .delete()
      .eq('centerId', authUser.centerId)
      .gte('date', range.start)
      .lt('date', range.end);
    if (error) return serverErrorResponse(error);

    return NextResponse.json({ success: true });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
