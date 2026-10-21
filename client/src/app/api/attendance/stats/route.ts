import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { getAttendanceRetentionCutoff, purgeExpiredAttendances } from '@/lib/attendanceRetention';
import { fetchAll } from '@/lib/pagedFetch';
import { loadStudentFinance, toDebtorRow } from '@/lib/studentFinance';

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: "Avtorizatsiyadan o'tilmagan" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');
    const daysParam = searchParams.get('days');

    const supabase = createServerSupabaseClient();

    // 2-month retention policy: clean up attendance older than previous month
    await purgeExpiredAttendances(supabase, authUser.centerId);
    const retentionCutoff = getAttendanceRetentionCutoff();

    let rangeStart: string;
    let rangeEnd: string | null = null;
    if (dateParam) {
      rangeStart = `${dateParam}T00:00:00.000Z`;
      rangeEnd = `${dateParam}T23:59:59.999Z`;
    } else {
      const days = Math.min(Math.max(parseInt(daysParam || '7', 10) || 7, 1), 366);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);
      rangeStart = startDate.toISOString();
    }

    // A 1000-student center produces 1000+ rows per lesson day: read them all, page by page
    const [records, allStudents] = await Promise.all([
      fetchAll<any>((from, to) => {
        let q = supabase
          .from('attendances')
          .select(`
            id,
            date,
            status,
            note,
            student:students (
              id,
              firstName,
              lastName,
              phone,
              fatherPhone,
              motherPhone
            ),
            group:groups (
              id,
              name
            )
          `)
          .eq('centerId', authUser.centerId)
          .gte('date', retentionCutoff)
          .gte('date', rangeStart);
        if (rangeEnd) q = q.lte('date', rangeEnd);
        return q.order('id').range(from, to);
      }),
      loadStudentFinance(supabase, authUser.centerId),
    ]);
    records.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 1. Group by date for Daily Chart
    const dateMap: Record<
      string,
      {
        date: string;
        KELGAN: number;
        KELMAGAN: number;
        KECHIKKAN: number;
        present: number;
        absent: number;
        late: number;
        total: number;
      }
    > = {};

    // 2. Group by Group for Group Stats
    const groupMap: Record<
      string,
      {
        groupId: string;
        groupName: string;
        KELGAN: number;
        KELMAGAN: number;
        KECHIKKAN: number;
        total: number;
      }
    > = {};

    // 3. Absent students list
    const absentStudents: any[] = [];

    (records || []).forEach((r: any) => {
      const d = r.date ? r.date.split('T')[0] : '';
      if (d) {
        if (!dateMap[d]) {
          dateMap[d] = {
            date: d,
            KELGAN: 0,
            KELMAGAN: 0,
            KECHIKKAN: 0,
            present: 0,
            absent: 0,
            late: 0,
            total: 0,
          };
        }
        dateMap[d].total += 1;
        if (r.status === 'KELGAN') {
          dateMap[d].KELGAN += 1;
          dateMap[d].present += 1;
        } else if (r.status === 'KELMAGAN') {
          dateMap[d].KELMAGAN += 1;
          dateMap[d].absent += 1;
        } else if (r.status === 'KECHIKKAN') {
          dateMap[d].KECHIKKAN += 1;
          dateMap[d].late += 1;
        }
      }

      // Group stats
      const gId = r.group?.id || 'unknown';
      const gName = r.group?.name || 'Guruh';
      if (!groupMap[gId]) {
        groupMap[gId] = {
          groupId: gId,
          groupName: gName,
          KELGAN: 0,
          KELMAGAN: 0,
          KECHIKKAN: 0,
          total: 0,
        };
      }
      groupMap[gId].total += 1;
      if (r.status === 'KELGAN') groupMap[gId].KELGAN += 1;
      else if (r.status === 'KELMAGAN') groupMap[gId].KELMAGAN += 1;
      else if (r.status === 'KECHIKKAN') groupMap[gId].KECHIKKAN += 1;

      // Absent and Late students list
      if (r.status === 'KELMAGAN' || r.status === 'KECHIKKAN') {
        absentStudents.push({
          id: r.id,
          date: d,
          status: r.status,
          studentName: `${r.student?.firstName || ''} ${r.student?.lastName || ''}`.trim() || "Noma'lum talaba",
          studentPhone: r.student?.phone || '-',
          fatherPhone: r.student?.fatherPhone || null,
          motherPhone: r.student?.motherPhone || null,
          groupName: r.group?.name || '-',
          note: r.note || '',
        });
      }
    });

    // 4. Calculate Unpaid / Debtor Students
    const unpaidStudents: any[] = [];

    allStudents.forEach((st) => {
      if (st.debt.debt > 0) unpaidStudents.push(toDebtorRow(st));
    });

    const dailyChart = Object.values(dateMap).map((counts) => ({
      ...counts,
      presentPercentage: counts.total > 0 ? Math.round((counts.KELGAN / counts.total) * 100) : 0,
    }));

    // Sort absent students from newest to oldest
    absentStudents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalRecords = records?.length || 0;
    const totalPresent = records?.filter((r: any) => r.status === 'KELGAN').length || 0;
    const totalAbsent = records?.filter((r: any) => r.status === 'KELMAGAN').length || 0;
    const totalLate = records?.filter((r: any) => r.status === 'KECHIKKAN').length || 0;
    const overallPercentage = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 100;

    return NextResponse.json({
      overallPercentage,
      totalRecords,
      totalPresent,
      totalAbsent,
      totalLate,
      dailyChart,
      dailyStats: dailyChart,
      groupStats: Object.values(groupMap),
      absentStudents,
      unpaidStudents,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
