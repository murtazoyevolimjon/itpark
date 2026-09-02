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
          birthDate,
          phone,
          fatherPhone,
          motherPhone,
          passportSeries,
          gender,
          isSchoolStudent,
          status,
          createdAt,
          studentGroups:student_groups(
            id,
            groupId,
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
        .eq('status', 'FAOL')
        .order('createdAt', { ascending: false }),
    ]);

    const probaStudents: any[] = [];
    const unpaidStudents: any[] = [];

    (allStudents || []).forEach((st: any) => {
      const activeGroups = (st.studentGroups || []).filter((sg: any) => sg.group);

      // If student has NO active group -> Proba / Sinov darsiga keladigan talaba
      if (activeGroups.length === 0) {
        probaStudents.push({
          id: st.id,
          studentName: `${st.firstName || ''} ${st.lastName || ''}`.trim() || "Noma'lum talaba",
          firstName: st.firstName,
          lastName: st.lastName,
          birthDate: st.birthDate,
          phone: st.phone || '-',
          fatherPhone: st.fatherPhone || null,
          motherPhone: st.motherPhone || null,
          passportSeries: st.passportSeries || null,
          gender: st.gender || 'ERKAK',
          isSchoolStudent: !!st.isSchoolStudent,
          createdAt: st.createdAt,
          status: st.status,
        });
        return;
      }

      // If student HAS active groups -> Calculate payment and debt status
      const payments = st.payments || [];
      const totalPaid = payments
        .filter((p: any) => p.status === 'TOLANGAN' || p.status === 'QISMAN')
        .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

      let totalDue = 0;
      const groupNames: string[] = [];
      activeGroups.forEach((sg: any) => {
        if (sg.group?.name) groupNames.push(sg.group.name);
        if (sg.group?.course?.price) {
          totalDue += Number(sg.group.course.price);
        }
      });

      const debt = Math.max(0, totalDue - totalPaid);
      const hasPaidFull = payments.some((p: any) => p.status === 'TOLANGAN');
      const hasPartial = totalPaid > 0 && debt > 0;

      const paymentStatus =
        (totalPaid >= totalDue && totalDue > 0) || hasPaidFull
          ? 'TOLANGAN'
          : hasPartial
          ? 'QISMAN'
          : 'TOLANMAGAN';

      if (paymentStatus !== 'TOLANGAN' && totalDue > 0) {
        unpaidStudents.push({
          id: st.id,
          studentName: `${st.firstName || ''} ${st.lastName || ''}`.trim() || "Noma'lum talaba",
          studentPhone: st.phone || '-',
          fatherPhone: st.fatherPhone || null,
          motherPhone: st.motherPhone || null,
          groupName: groupNames.join(', ') || '-',
          coursePrice: totalDue,
          totalPaid,
          debtAmount: debt,
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
      probaStudents,
      probaStudentsCount: probaStudents.length,
      unpaidStudents,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
