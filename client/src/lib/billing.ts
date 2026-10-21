/**
 * Monthly billing rules (pure functions, no database).
 *
 * - Every group a student is enrolled in costs its course price EVERY month.
 * - A month is due from the month of the student's FIRST attendance in that group (at most MAX_DEBT_MONTHS back).
 *   A student who has not been marked in the group yet owes nothing.
 * - A payment belongs to one group and one calendar month (UTC, same as the database month index).
 * - Several partial payments may add up to the price; a payment marked TOLANGAN closes the month.
 */

export const MAX_DEBT_MONTHS = 6;

export interface BillingGroup {
  id: string;
  name: string;
  price: number;
  /** Date of the first attendance in this group; null = the student has not started yet */
  startedAt?: string | null;
}

export interface BillingPayment {
  groupId?: string | null;
  amount: number;
  status: string;
  paymentDate?: string | null;
}

export interface MonthDebt {
  groupId: string;
  groupName: string;
  month: string;
  due: number;
  paid: number;
  remaining: number;
}

export interface DebtSummary {
  months: MonthDebt[];
  /** Sum of the monthly prices of all groups (what the student pays per month) */
  monthlyPrice: number;
  totalDue: number;
  totalPaid: number;
  debt: number;
  unpaidMonths: string[];
  unpaidGroupNames: string[];
  status: 'TOLANGAN' | 'QISMAN' | 'TOLANMAGAN';
  lastPaymentDate: string | null;
}

const COUNTED = new Set(['TOLANGAN', 'QISMAN']);

/** 'YYYY-MM' (UTC) of a date or ISO string; null when it is not a valid date. */
export function monthKey(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 7);
}

export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/** Inclusive list of months between two 'YYYY-MM' values (empty when start is after end). */
export function monthsBetween(startYm: string, endYm: string): string[] {
  const out: string[] = [];
  let cur = startYm;
  for (let i = 0; i < 600 && cur <= endYm; i++) {
    out.push(cur);
    cur = shiftMonth(cur, 1);
  }
  return out;
}

export function computeDebt(input: {
  groups: BillingGroup[];
  payments: BillingPayment[];
  now?: Date;
}): DebtSummary {
  const now = input.now || new Date();
  const nowYm = monthKey(now) as string;
  const earliest = shiftMonth(nowYm, -(MAX_DEBT_MONTHS - 1));

  const groups = [...input.groups].sort((a, b) =>
    String(a.startedAt || '').localeCompare(String(b.startedAt || ''))
  );
  const counted = input.payments.filter((p) => COUNTED.has(p.status) && monthKey(p.paymentDate));

  // A payment without a group belongs to the student's oldest group that has a price
  const defaultGroupId = (groups.find((g) => Number(g.price) > 0) || groups[0])?.id;
  const paymentsOf = (groupId: string, ym: string) =>
    counted.filter(
      (p) => (p.groupId || defaultGroupId) === groupId && monthKey(p.paymentDate) === ym
    );

  const months: MonthDebt[] = [];
  for (const g of groups) {
    const price = Number(g.price) || 0;
    if (price <= 0) continue;
    const started = monthKey(g.startedAt);
    if (!started) continue;
    const start = started > earliest ? started : earliest;
    for (const ym of monthsBetween(start, nowYm)) {
      const rows = paymentsOf(g.id, ym);
      const closed = rows.some((p) => p.status === 'TOLANGAN');
      const raw = rows.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const paid = closed ? price : Math.min(raw, price);
      months.push({ groupId: g.id, groupName: g.name, month: ym, due: price, paid, remaining: price - paid });
    }
  }

  const totalDue = months.reduce((s, m) => s + m.due, 0);
  const totalPaid = months.reduce((s, m) => s + m.paid, 0);
  const debt = months.reduce((s, m) => s + m.remaining, 0);
  const unpaid = months.filter((m) => m.remaining > 0);

  let status: DebtSummary['status'];
  if (totalDue === 0) {
    status = counted.some((p) => p.status === 'TOLANGAN') ? 'TOLANGAN' : counted.length > 0 ? 'QISMAN' : 'TOLANMAGAN';
  } else if (debt === 0) {
    status = 'TOLANGAN';
  } else if (totalPaid > 0) {
    status = 'QISMAN';
  } else {
    status = 'TOLANMAGAN';
  }

  const last = counted
    .map((p) => String(p.paymentDate))
    .sort()
    .pop();

  return {
    months,
    monthlyPrice: groups.reduce((s, g) => s + (Number(g.price) || 0), 0),
    totalDue,
    totalPaid,
    debt,
    unpaidMonths: Array.from(new Set(unpaid.map((m) => m.month))).sort(),
    unpaidGroupNames: Array.from(new Set(unpaid.map((m) => m.groupName))),
    status,
    lastPaymentDate: last ? last.split('T')[0] : null,
  };
}

/** What a new payment may do to a (student, group, month): the remaining amount and the status it gets. */
export function planPayment(input: {
  price: number;
  existing: BillingPayment[];
  amount: number;
}): { ok: true; status: 'TOLANGAN' | 'QISMAN'; remainingAfter: number } | { ok: false; message: string } {
  const price = Number(input.price) || 0;
  const counted = input.existing.filter((p) => COUNTED.has(p.status));
  const paidBefore = counted.some((p) => p.status === 'TOLANGAN')
    ? Math.max(price, counted.reduce((s, p) => s + (Number(p.amount) || 0), 0))
    : counted.reduce((s, p) => s + (Number(p.amount) || 0), 0);

  if (price <= 0) {
    // No price on the course: keep the old rule, one payment per month
    return counted.length > 0
      ? { ok: false, message: "Bu oy uchun to'lov allaqachon mavjud" }
      : { ok: true, status: 'TOLANGAN', remainingAfter: 0 };
  }
  if (paidBefore >= price) {
    return { ok: false, message: "Bu oy uchun to'lov to'liq to'langan" };
  }
  const remaining = price - paidBefore;
  if (input.amount > remaining) {
    return {
      ok: false,
      message: `Summa qolgan qarzdan oshib ketdi. Bu oy uchun ${remaining.toLocaleString('uz-UZ')} so'm qoldi`,
    };
  }
  const remainingAfter = remaining - input.amount;
  return { ok: true, status: remainingAfter === 0 ? 'TOLANGAN' : 'QISMAN', remainingAfter };
}
