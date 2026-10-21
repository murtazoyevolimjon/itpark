import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { getStudentSubject } from '@/lib/credentials';
import { loadStudentFinance } from '@/lib/studentFinance';

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
      allStudents,
    ] = await Promise.all([
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('centerId', authUser.centerId),
      supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('centerId', authUser.centerId),
      supabase.from('courses').select('*', { count: 'exact', head: true }).eq('centerId', authUser.centerId),
      supabase.from('groups').select('*', { count: 'exact', head: true }).eq('centerId', authUser.centerId),
      supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('centerId', authUser.centerId),
      supabase.from('employees').select('*', { count: 'exact', head: true }).eq('centerId', authUser.centerId),
      loadStudentFinance(supabase, authUser.centerId),
    ]);

    const probaStudents: any[] = [];
    const unpaidStudents: any[] = [];

    allStudents.forEach((st) => {
      const activeGroups = st.groups;

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
          // Never expose the raw "CRED:login|pass|..." payload: only the subject leaves the server
          passportSeries: getStudentSubject(st) || null,
          subject: getStudentSubject(st) || null,
          gender: st.gender || 'ERKAK',
          isSchoolStudent: !!st.isSchoolStudent,
          createdAt: st.createdAt,
          status: st.status,
        });
        return;
      }

      // If student HAS active groups -> Calculate payment and debt status
      const payments = st.payments;
      const totalPaid = payments
        .filter((p) => p.status === 'TOLANGAN' || p.status === 'QISMAN')
        .reduce((sum, p) => sum + p.amount, 0);

      let totalDue = 0;
      const groupNames: string[] = [];
      activeGroups.forEach((g) => {
        if (g.name) groupNames.push(g.name);
        totalDue += g.price;
      });

      const debt = Math.max(0, totalDue - totalPaid);
      const hasPaidFull = payments.some((p) => p.status === 'TOLANGAN');
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
