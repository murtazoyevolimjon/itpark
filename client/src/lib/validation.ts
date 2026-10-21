/**
 * Small input validators. Every helper returns an Uzbek error message, or null when the value is fine,
 * so a route can do: `const err = firstError(text(...), money(...)); if (err) return 400`.
 */

export const ENUMS = {
  groupStatus: ['FAOL', 'TUGAGAN', 'TO_XTATILGAN'],
  activeStatus: ['FAOL', 'NOFAOL'],
  studentStatus: ['FAOL', 'BITIRGAN', 'CHIQIB_KETGAN'],
  gender: ['ERKAK', 'AYOL'],
  attendanceStatus: ['KELGAN', 'KELMAGAN', 'KECHIKKAN'],
  paymentMethod: ['NAQD', 'KARTA', 'OTKAZMA'],
  paymentStatus: ['TOLANGAN', 'TOLANMAGAN', 'QISMAN'],
  expenseType: ['USTOZ_MAOSHI', 'IJARA', 'KOMMUNAL', 'REKLAMA', 'BOSHQA'],
  expenseStatus: ['KUTILMOQDA', 'TOLANGAN'],
  salaryType: ['FIXED', 'PERCENT'],
} as const;

export function firstError(...errors: Array<string | null | undefined>): string | null {
  return errors.find((e) => !!e) || null;
}

export function text(value: unknown, label: string, max = 120): string | null {
  if (typeof value !== 'string' || !value.trim()) return `${label} kiritilishi shart`;
  if (value.trim().length > max) return `${label} ${max} belgidan oshmasligi kerak`;
  return null;
}

export function optionalText(value: unknown, label: string, max = 500): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') return `${label} noto'g'ri`;
  if (value.length > max) return `${label} ${max} belgidan oshmasligi kerak`;
  return null;
}

export function oneOf(value: unknown, list: readonly string[], label: string): string | null {
  if (typeof value !== 'string' || !list.includes(value)) return `${label} noto'g'ri`;
  return null;
}

export interface NumberRules {
  min?: number;
  max?: number;
  integer?: boolean;
}

export function numberValue(value: unknown, label: string, rules: NumberRules = {}): string | null {
  const n = typeof value === 'string' ? Number(value.replace(/\s/g, '')) : Number(value);
  if (value === '' || value === null || value === undefined || !Number.isFinite(n)) {
    return `${label} to'g'ri son bo'lishi kerak`;
  }
  if (rules.integer && !Number.isInteger(n)) return `${label} butun son bo'lishi kerak`;
  if (rules.min !== undefined && n < rules.min) return `${label} ${rules.min} dan kichik bo'lmasligi kerak`;
  if (rules.max !== undefined && n > rules.max) return `${label} ${rules.max} dan oshmasligi kerak`;
  return null;
}

/** Money amount: finite, > 0 and below a sanity cap that catches typos like extra zeros. */
export function money(value: unknown, label = 'Summa'): string | null {
  const err = numberValue(value, label, { min: 0 });
  if (err) return err;
  const n = Number(value);
  if (n <= 0) return `${label} 0 dan katta bo'lishi kerak`;
  if (n > 1_000_000_000_000) return `${label} juda katta`;
  return null;
}

export function phoneDigits(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\D/g, '') : '';
}

export function phone(value: unknown, label = 'Telefon raqam', required = true): string | null {
  const digits = phoneDigits(value);
  if (!digits) return required ? `${label} kiritilishi shart` : null;
  if (digits.length < 9 || digits.length > 15) return `${label} noto'g'ri`;
  return null;
}

export function validDate(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return false;
  const d = new Date(value as any);
  return !Number.isNaN(d.getTime()) && d.getFullYear() > 1900 && d.getFullYear() < 2200;
}

export function date(value: unknown, label: string, opts: { notFuture?: boolean; required?: boolean } = {}): string | null {
  if (value === undefined || value === null || value === '') {
    return opts.required === false ? null : `${label} kiritilishi shart`;
  }
  if (!validDate(value)) return `${label} noto'g'ri`;
  if (opts.notFuture && new Date(value as any).getTime() > Date.now() + 24 * 60 * 60 * 1000) {
    return `${label} kelajakda bo'lishi mumkin emas`;
  }
  return null;
}
