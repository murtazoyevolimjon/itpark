import { planPayment } from './billing';

const MONTH_NAMES = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];

export interface MonthlyPaymentInput {
  studentId: string;
  groupId?: string | null;
  courseId?: string | null;
  payDate: Date;
  amount: number;
  /** Requested status; TOLANMAGAN / BEKOR_QILINGAN records are not real payments and skip the checks */
  status?: string | null;
  /** When editing: the payment itself must not count against the month */
  excludePaymentId?: string;
}

export type MonthlyPaymentResult =
  | { ok: true; groupId: string | null; courseId: string | null; status: string }
  | { ok: false; message: string };

/**
 * Decides which group a payment belongs to and what status it gets.
 * A month's price may be paid in several parts; the parts never exceed the price and
 * the part that completes the month becomes TOLANGAN, earlier parts are QISMAN.
 */
export async function evaluateMonthlyPayment(
  supabase: any,
  centerId: string,
  input: MonthlyPaymentInput
): Promise<MonthlyPaymentResult> {
  let groupId = input.groupId || null;
  let courseId = input.courseId || null;

  if (!groupId) {
    const { data: sg } = await supabase
      .from('student_groups')
      .select('groupId, group:groups(courseId)')
      .eq('studentId', input.studentId)
      .eq('centerId', centerId)
      .limit(1)
      .maybeSingle();
    if (sg) {
      groupId = sg.groupId;
      courseId = sg?.group?.courseId || courseId;
    }
  }

  let monthlyPrice = 0;
  if (groupId) {
    const { data: g } = await supabase
      .from('groups')
      .select('course:courses(price)')
      .eq('id', groupId)
      .eq('centerId', centerId)
      .maybeSingle();
    const course = Array.isArray(g?.course) ? g.course[0] : g?.course;
    monthlyPrice = Number(course?.price) || 0;
  } else if (courseId) {
    const { data: course } = await supabase.from('courses').select('price').eq('id', courseId).maybeSingle();
    monthlyPrice = Number(course?.price) || 0;
  }

  const requested = input.status || 'TOLANGAN';
  if (requested === 'TOLANMAGAN' || requested === 'BEKOR_QILINGAN') {
    return { ok: true, groupId, courseId, status: requested };
  }

  // Month boundaries in UTC: the same month the database works with
  const year = input.payDate.getUTCFullYear();
  const month = input.payDate.getUTCMonth();
  const startOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0)).toISOString();
  const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)).toISOString();

  let query = supabase
    .from('payments')
    .select('id, amount, paymentDate, status, groupId')
    .eq('centerId', centerId)
    .eq('studentId', input.studentId)
    .gte('paymentDate', startOfMonth)
    .lte('paymentDate', endOfMonth);
  query = groupId ? query.eq('groupId', groupId) : query.is('groupId', null);
  if (input.excludePaymentId) query = query.neq('id', input.excludePaymentId);

  const { data: existing, error } = await query;
  if (error) return { ok: false, message: error.message };

  const plan = planPayment({
    price: monthlyPrice,
    existing: (existing || []).map((p: any) => ({
      groupId: p.groupId,
      amount: Number(p.amount) || 0,
      status: p.status,
      paymentDate: p.paymentDate,
    })),
    amount: Number(input.amount) || 0,
  });
  if (!plan.ok) return { ok: false, message: `${MONTH_NAMES[month]} ${year}: ${plan.message}` };

  return { ok: true, groupId, courseId, status: plan.status };
}
