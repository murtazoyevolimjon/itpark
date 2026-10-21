import { describe, expect, it } from 'vitest';
import { computeDebt, monthKey, monthsBetween, planPayment, shiftMonth } from '../billing';

const NOW = new Date('2026-10-15T10:00:00.000Z');
const math = { id: 'math', name: 'Matematika', price: 500_000, startedAt: '2026-10-02T00:00:00.000Z' };
const english = { id: 'eng', name: 'Ingliz tili', price: 400_000, startedAt: '2026-10-02T00:00:00.000Z' };
const pay = (groupId: string | null, amount: number, status: string, date: string) => ({
  groupId,
  amount,
  status,
  paymentDate: `${date}T09:00:00.000Z`,
});

describe('month helpers', () => {
  it('handles year boundaries', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(monthsBetween('2026-11', '2027-02')).toEqual(['2026-11', '2026-12', '2027-01', '2027-02']);
    expect(monthsBetween('2026-10', '2026-09')).toEqual([]);
    expect(monthKey('not a date')).toBeNull();
  });
});

describe('computeDebt: one student, two subjects', () => {
  it('owes both subjects in the first month', () => {
    const d = computeDebt({ groups: [math, english], payments: [], now: NOW });
    expect(d.debt).toBe(900_000);
    expect(d.monthlyPrice).toBe(900_000);
    expect(d.status).toBe('TOLANMAGAN');
    expect(d.unpaidGroupNames.sort()).toEqual(['Ingliz tili', 'Matematika']);
  });

  it('paying only math leaves the english debt (the old all-time sum hid it)', () => {
    const d = computeDebt({
      groups: [math, english],
      payments: [pay('math', 500_000, 'TOLANGAN', '2026-10-03')],
      now: NOW,
    });
    expect(d.debt).toBe(400_000);
    expect(d.status).toBe('QISMAN');
    expect(d.unpaidGroupNames).toEqual(['Ingliz tili']);
  });

  it('a new month brings a new debt even after the previous month was fully paid', () => {
    const d = computeDebt({
      groups: [{ ...math, startedAt: '2026-09-02T00:00:00.000Z' }],
      payments: [pay('math', 500_000, 'TOLANGAN', '2026-09-05')],
      now: NOW,
    });
    expect(d.unpaidMonths).toEqual(['2026-10']);
    expect(d.debt).toBe(500_000);
  });

  it('two math payments cannot hide an english debt', () => {
    const d = computeDebt({
      groups: [{ ...math, startedAt: '2026-09-02T00:00:00.000Z' }, { ...english, startedAt: '2026-09-02T00:00:00.000Z' }],
      payments: [pay('math', 500_000, 'TOLANGAN', '2026-09-05'), pay('math', 500_000, 'TOLANGAN', '2026-10-05')],
      now: NOW,
    });
    expect(d.debt).toBe(800_000);
  });

  it('partial payments add up and close the month', () => {
    const partial = computeDebt({ groups: [math], payments: [pay('math', 300_000, 'QISMAN', '2026-10-03')], now: NOW });
    expect(partial.debt).toBe(200_000);
    expect(partial.status).toBe('QISMAN');
    const full = computeDebt({
      groups: [math],
      payments: [pay('math', 300_000, 'QISMAN', '2026-10-03'), pay('math', 200_000, 'TOLANGAN', '2026-10-09')],
      now: NOW,
    });
    expect(full.debt).toBe(0);
    expect(full.status).toBe('TOLANGAN');
  });

  it('a student who has not been marked present in the group yet owes nothing', () => {
    const d = computeDebt({ groups: [{ ...math, startedAt: null }], payments: [], now: NOW });
    expect(d.debt).toBe(0);
    expect(d.months).toHaveLength(0);
  });

  it('ignores unpaid / cancelled records and never goes back more than 6 months', () => {
    const d = computeDebt({
      groups: [{ ...math, startedAt: '2020-01-01T00:00:00.000Z' }],
      payments: [pay('math', 500_000, 'TOLANMAGAN', '2026-10-03'), pay('math', 500_000, 'BEKOR_QILINGAN', '2026-10-04')],
      now: NOW,
    });
    expect(d.months).toHaveLength(6);
    expect(d.debt).toBe(3_000_000);
  });

  it('a payment without a group counts for the oldest group; groups without a price are free', () => {
    const d = computeDebt({
      groups: [math, { id: 'free', name: 'Bepul', price: 0, startedAt: null }],
      payments: [pay(null, 500_000, 'TOLANGAN', '2026-10-03')],
      now: NOW,
    });
    expect(d.debt).toBe(0);
    expect(d.status).toBe('TOLANGAN');
  });
});

describe('planPayment', () => {
  const price = 500_000;
  it('first partial payment becomes QISMAN, the rest closes the month', () => {
    expect(planPayment({ price, existing: [], amount: 300_000 })).toEqual({ ok: true, status: 'QISMAN', remainingAfter: 200_000 });
    expect(planPayment({ price, existing: [pay('g', 300_000, 'QISMAN', '2026-10-03')], amount: 200_000 })).toEqual({
      ok: true,
      status: 'TOLANGAN',
      remainingAfter: 0,
    });
  });
  it('rejects overpaying and paying a closed month', () => {
    const over = planPayment({ price, existing: [pay('g', 300_000, 'QISMAN', '2026-10-03')], amount: 300_000 });
    expect(over.ok).toBe(false);
    const closed = planPayment({ price, existing: [pay('g', 500_000, 'TOLANGAN', '2026-10-03')], amount: 1000 });
    expect(closed.ok).toBe(false);
  });
  it('keeps one payment per month when the course has no price', () => {
    expect(planPayment({ price: 0, existing: [], amount: 1000 }).ok).toBe(true);
    expect(planPayment({ price: 0, existing: [pay('g', 1000, 'TOLANGAN', '2026-10-03')], amount: 1000 }).ok).toBe(false);
  });
});
