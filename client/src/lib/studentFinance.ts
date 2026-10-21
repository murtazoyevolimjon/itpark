import { SupabaseClient } from '@supabase/supabase-js';
import { fetchAll } from './pagedFetch';
import { BillingGroup, BillingPayment, DebtSummary, computeDebt } from './billing';

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
  /** Groups the student is currently enrolled in (with the course price and first-attendance date) */
  groups: BillingGroup[];
  payments: BillingPayment[];
  /** Month-by-month debt over all enrolled groups */
  debt: DebtSummary;
}

/**
 * Every active student of a center with the groups, payments and monthly debt the reports need.
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
    loadMemberships(supabase, centerId),
    fetchAll<any>((from, to) =>
      supabase
        .from('payments')
        .select('id, studentId, groupId, amount, status, paymentDate')
        .eq('centerId', centerId)
        .order('id')
        .range(from, to)
    ),
  ]);

  const groupById = new Map<string, { id: string; name: string; price: number }>();
  for (const g of groupRows) {
    const course = Array.isArray(g.course) ? g.course[0] : g.course;
    groupById.set(g.id, { id: g.id, name: g.name, price: Number(course?.price) || 0 });
  }

  const groupsByStudent = new Map<string, BillingGroup[]>();
  for (const l of links) {
    const g = groupById.get(l.groupId);
    if (!g) continue;
    const list = groupsByStudent.get(l.studentId) || [];
    list.push({ ...g, startedAt: l.startedAt || null });
    groupsByStudent.set(l.studentId, list);
  }

  const paymentsByStudent = new Map<string, BillingPayment[]>();
  for (const p of payments) {
    const list = paymentsByStudent.get(p.studentId) || [];
    list.push({ groupId: p.groupId || null, amount: Number(p.amount) || 0, status: p.status, paymentDate: p.paymentDate || null });
    paymentsByStudent.set(p.studentId, list);
  }

  return students
    .map((s: any): StudentFinanceRow => {
      const groups = groupsByStudent.get(s.id) || [];
      const studentPayments = paymentsByStudent.get(s.id) || [];
      return {
        ...s,
        groups,
        payments: studentPayments,
        debt: computeDebt({ groups, payments: studentPayments }),
      };
    })
    .sort((a: StudentFinanceRow, b: StudentFinanceRow) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

/**
 * Memberships with the date billing starts for each (the first attendance, stored in billingStartDate).
 * Falls back to the join date while the column does not exist yet (migration not applied).
 */
async function loadMemberships(supabase: SupabaseClient, centerId: string): Promise<any[]> {
  const read = (cols: string) =>
    fetchAll<any>((from, to) =>
      supabase
        .from('student_groups')
        .select(cols)
        .eq('group.centerId', centerId)
        .order('id')
        .range(from, to)
    );
  try {
    const rows = await read('id, studentId, groupId, billingStartDate, group:groups!inner(centerId)');
    return rows.map((r: any) => ({ ...r, startedAt: r.billingStartDate || null }));
  } catch (err: any) {
    if (!/billingStartDate/i.test(String(err?.message || ''))) throw err;
    const rows = await read('id, studentId, groupId, joinedAt, group:groups!inner(centerId)');
    return rows.map((r: any) => ({ ...r, startedAt: r.joinedAt || null }));
  }
}
/** Shape of a debtor row in the dashboard / attendance reports. */
export function toDebtorRow(st: StudentFinanceRow) {
  const d = st.debt;
  return {
    id: st.id,
    studentName: `${st.firstName || ''} ${st.lastName || ''}`.trim() || "Noma'lum talaba",
    studentPhone: st.phone || '-',
    fatherPhone: st.fatherPhone || null,
    motherPhone: st.motherPhone || null,
    groupName: d.unpaidGroupNames.join(', ') || '-',
    // The price the student pays every month; debt is the unpaid part over the due months
    coursePrice: d.monthlyPrice,
    totalPaid: d.totalPaid,
    debtAmount: d.debt,
    paymentStatus: d.status,
    unpaidMonths: d.unpaidMonths,
    lastPaymentDate: d.lastPaymentDate,
  };
}
