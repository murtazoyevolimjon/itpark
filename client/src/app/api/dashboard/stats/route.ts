import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { getStudentSubject } from '@/lib/credentials';
import { loadStudentFinance, toDebtorRow } from '@/lib/studentFinance';

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

      // Student has groups: owes money when any due month (price per group per month) is not fully paid
      if (st.debt.debt > 0) unpaidStudents.push(toDebtorRow(st));
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
