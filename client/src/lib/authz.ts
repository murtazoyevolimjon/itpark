import { NextResponse } from 'next/server';
import type { JwtPayload } from './auth';

/** Center staff (owner / admin). Teachers and legacy student tokens are not staff. */
export const isStaff = (user: JwtPayload): boolean => user.role !== 'TEACHER' && user.role !== 'STUDENT';

export const isTeacher = (user: JwtPayload): boolean => user.role === 'TEACHER';

export const forbidden = (message = "Ruxsat yo'q") => NextResponse.json({ message }, { status: 403 });

/** Returns a 403 response unless the caller is center staff (owner / admin). */
export const requireStaff = (user: JwtPayload) => (isStaff(user) ? null : forbidden());

/** A teacher may only work with the groups they lead (their id is the token subject). */
export async function teacherOwnsGroup(supabase: any, user: JwtPayload, groupId: string): Promise<boolean> {
  if (!groupId) return false;
  const { data } = await supabase
    .from('groups')
    .select('id')
    .eq('id', groupId)
    .eq('centerId', user.centerId)
    .eq('teacherId', user.sub)
    .maybeSingle();
  return !!data;
}
