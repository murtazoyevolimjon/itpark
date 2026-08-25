import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: "Avtorizatsiyadan o'tilmagan" }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();

    const [
      { count: studentsCount },
      { count: teachersCount },
      { count: coursesCount },
      { count: groupsCount },
      { count: roomsCount },
      { count: employeesCount },
      { data: allStudents },
    ] = await Promise.all([
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('centerId', authUser.centerId),
      supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('centerId', authUser.centerId),
      supabase.from('courses').select('*', { count: 'exact', head: true }).eq('centerId', authUser.centerId),
      supabase.from('groups').select('*', { count: 'exact', head: true }).eq('centerId', authUser.centerId),
      supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('centerId', authUser.centerId),
      supabase.from('employees').select('*', { count: 'exact', head: true }).eq('centerId', authUser.centerId),
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

    // Calculate Unpaid / Debtor Students
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
          debtAmount: totalDue > 0 ? debt : 0,
          paymentStatus,
          lastPaymentDate: payments[0]?.paymentDate ? payments[0].paymentDate.split('T')[0] : null,
        });
      }
    });

    return NextResponse.json({
      studentsCount: studentsCount || 0,
      teachersCount: teachersCount || 0,
      coursesCount: coursesCount || 0,
      groupsCount: groupsCount || 0,
      roomsCount: roomsCount || 0,
      employeesCount: employeesCount || 0,
      unpaidStudents,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
