import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: "Avtorizatsiyadan o'tilmagan" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30', 10);

    const supabase = createServerSupabaseClient();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const [
      { data: records, error },
      { data: allStudents, error: studentsError },
    ] = await Promise.all([
      supabase
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
        .gte('date', startDate.toISOString())
        .order('date', { ascending: true }),

      supabase
        .from('students')
        .select(`
          id,
          firstName,
          lastName,
          phone,
          fatherPhone,
          motherPhone,
          status,
          studentGroups:student_groups(
            group:groups(
              id,
              name,
              course:courses(
                id,
                name,
                price
              )
            )
          ),
          payments(
            id,
            amount,
            status,
            paymentDate
          )
        `)
        .eq('centerId', authUser.centerId)
        .eq('status', 'FAOL'),
    ]);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

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

    (allStudents || []).forEach((st: any) => {
      const payments = st.payments || [];
      const totalPaid = payments
        .filter((p: any) => p.status === 'TOLANGAN' || p.status === 'QISMAN')
        .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

      let totalDue = 0;
      const groupNames: string[] = [];
      (st.studentGroups || []).forEach((sg: any) => {
        if (sg.group) {
          if (sg.group.name) groupNames.push(sg.group.name);
          if (sg.group.course?.price) {
            totalDue += Number(sg.group.course.price);
          }
        }
      });

      const debt = Math.max(0, totalDue - totalPaid);
      const hasPaidFull = payments.some((p: any) => p.status === 'TOLANGAN');
      const hasPartial = totalPaid > 0 && debt > 0;

      const paymentStatus = (totalPaid >= totalDue && totalDue > 0) || hasPaidFull
        ? 'TOLANGAN'
        : hasPartial
        ? 'QISMAN'
        : 'TOLANMAGAN';

      if (paymentStatus !== 'TOLANGAN') {
        unpaidStudents.push({
          id: st.id,
          studentName: `${st.firstName || ''} ${st.lastName || ''}`.trim() || "Noma'lum talaba",
          studentPhone: st.phone || '-',
          fatherPhone: st.fatherPhone || null,
          motherPhone: st.motherPhone || null,
          groupName: groupNames.join(', ') || '-',
          coursePrice: totalDue,
          totalPaid,
          debtAmount: totalDue > 0 ? debt : (totalPaid === 0 ? 0 : 0),
          paymentStatus,
          lastPaymentDate: payments[0]?.paymentDate ? payments[0].paymentDate.split('T')[0] : null,
        });
      }
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
