import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();

    const [
      { count: studentsCount },
      { count: teachersCount },
      { count: employeesCount },
      { count: coursesCount },
      { count: groupsCount },
      { count: graduatesCount },
      { count: certificatesCount },
    ] = await Promise.all([
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('centerId', authUser.centerId),
      supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('centerId', authUser.centerId),
      supabase.from('employees').select('*', { count: 'exact', head: true }).eq('centerId', authUser.centerId),
      supabase.from('courses').select('*', { count: 'exact', head: true }).eq('centerId', authUser.centerId),
      supabase.from('groups').select('*', { count: 'exact', head: true }).eq('centerId', authUser.centerId),
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('centerId', authUser.centerId).eq('status', 'BITIRGAN'),
      supabase.from('certificates').select('*', { count: 'exact', head: true }).eq('centerId', authUser.centerId),
    ]);

    return NextResponse.json({
      studentsCount: studentsCount || 0,
      teachersCount: teachersCount || 0,
      employeesCount: employeesCount || 0,
      coursesCount: coursesCount || 0,
      groupsCount: groupsCount || 0,
      graduatesCount: graduatesCount || 0,
      certificatesCount: certificatesCount || 0,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
