import { SupabaseClient } from '@supabase/supabase-js';
import { fetchAll } from './pagedFetch';

export interface FinanceGroup {
  id: string;
  name: string;
  price: number;
}

export interface FinancePayment {
  amount: number;
  status: string;
  paymentDate: string | null;
}

export interface StudentFinanceRow {
  id: string;
  firstName: string | null;
  lastName: string | null;
  birthDate: string | null;
  phone: string | null;
  fatherPhone: string | null;
  motherPhone: string | null;
  passportSeries: string | null;
  gender: string | null;
  isSchoolStudent: boolean | null;
  status: string;
  createdAt: string | null;
  /** Groups the student is currently enrolled in (with the course price) */
  groups: FinanceGroup[];
  /** Newest payment first */
  payments: FinancePayment[];
}

/**
 * Every active student of a center with the groups and payments the debt reports need.
 * Four flat paged reads instead of one deeply nested join: a center with 1000+ students stays
 * correct (no silent 1000-row cut-off) and the response size stays small.
 */
export async function loadStudentFinance(supabase: SupabaseClient, centerId: string): Promise<StudentFinanceRow[]> {
  const [students, groupRows, links, payments] = await Promise.all([
    fetchAll<any>((from, to) =>
      supabase
        .from('students')
        .select('id, firstName, lastName, birthDate, phone, fatherPhone, motherPhone, passportSeries, gender, isSchoolStudent, status, createdAt')
        .eq('centerId', centerId)
        .eq('status', 'FAOL')
        .order('id')
        .range(from, to)
    ),
    fetchAll<any>((from, to) =>
      supabase.from('groups').select('id, name, course:courses(price)').eq('centerId', centerId).order('id').range(from, to)
    ),
    fetchAll<any>((from, to) =>
      supabase
        .from('student_groups')
        .select('id, studentId, groupId, group:groups!inner(centerId)')
        .eq('group.centerId', centerId)
        .order('id')
        .range(from, to)
    ),
    fetchAll<any>((from, to) =>
      supabase
        .from('payments')
        .select('id, studentId, amount, status, paymentDate')
        .eq('centerId', centerId)
        .order('id')
        .range(from, to)
    ),
  ]);

  const groupById = new Map<string, FinanceGroup>();
  for (const g of groupRows) {
    const course = Array.isArray(g.course) ? g.course[0] : g.course;
    groupById.set(g.id, { id: g.id, name: g.name, price: Number(course?.price) || 0 });
  }

  const groupsByStudent = new Map<string, FinanceGroup[]>();
  for (const l of links) {
    const g = groupById.get(l.groupId);
    if (!g) continue;
    const list = groupsByStudent.get(l.studentId) || [];
    list.push(g);
    groupsByStudent.set(l.studentId, list);
  }

  const paymentsByStudent = new Map<string, FinancePayment[]>();
  for (const p of payments) {
    const list = paymentsByStudent.get(p.studentId) || [];
    list.push({ amount: Number(p.amount) || 0, status: p.status, paymentDate: p.paymentDate || null });
    paymentsByStudent.set(p.studentId, list);
  }
  paymentsByStudent.forEach((list) =>
    list.sort((a, b) => new Date(b.paymentDate || 0).getTime() - new Date(a.paymentDate || 0).getTime())
  );

  return students
    .map((s: any) => ({
      ...s,
      groups: groupsByStudent.get(s.id) || [],
      payments: paymentsByStudent.get(s.id) || [],
    }))
    .sort((a: StudentFinanceRow, b: StudentFinanceRow) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}
