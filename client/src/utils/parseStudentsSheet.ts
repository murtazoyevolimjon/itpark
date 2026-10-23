import { isValidUzPhone, normalizeUzPhone } from './uzPhone';

export interface ParsedStudentRow {
  /** 1-based row number in the file (header excluded), for messages */
  line: number;
  firstName: string;
  lastName: string;
  phone: string;
  parentPhone: string;
  problem: string | null;
}

export interface ParsedSheet {
  rows: ParsedStudentRow[];
  /** true when one column held "Familiya Ism" and had to be split */
  splitFullName: boolean;
}

type Role = 'first' | 'last' | 'full' | 'phone' | 'parent';

const clean = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim();

const looksLikePhone = (v: string) => {
  const d = v.replace(/\D/g, '');
  return d.length >= 9 && d.length <= 13 && /^[\d\s()+\-.,;/]+$/.test(v);
};

/** What a header cell means, or null for columns that are not needed (№, birth date, group...) */
function roleOfHeader(header: string): Role | null {
  const h = header.toLowerCase().replace(/[’`ʻʼ‘]/g, "'");
  if (!h) return null;
  if (/(^|[^a-zа-я])(ota|ona|otasi|onasi|ota-ona|parent|valid)|родит|мама|папа|отец|мать/.test(h)) return 'parent';
  if (/tel|raqam|phone|nomer|тел|номер/.test(h)) return 'phone';
  if (/familiya|surname|last|фамили/.test(h) && !/ism|имя/.test(h.replace(/familiya|фамили\w*/g, ''))) return 'last';
  if (/familiya|фамили/.test(h)) return 'full';
  if (/^(ism|ismi|ism\*|name|first|имя)/.test(h)) return 'first';
  if (/f\.?\s?i\.?\s?(o|sh)|fish|fio|o'quvchi|oquvchi|talaba|student|full|ф\.?и\.?о|ученик|студент|nomi/.test(h)) return 'full';
  return null;
}

/** First phone of a cell that may hold several ("90 123 45 67, 91 234 56 78") */
function firstPhone(cell: string): string {
  const parts = cell.split(/[;,/\n]| va | и /).map((p) => p.trim()).filter(Boolean);
  return normalizeUzPhone(parts[0] || '');
}

/**
 * Reads the rows of a sheet (array of arrays) into students. Works with a header row in Uzbek, English or
 * Russian ("Ism", "Familiya", "Telefon", "Ota-onasining telefoni", "F.I.Sh"...). Without a header the
 * columns are guessed from their content: phone-looking columns are phones, text columns are names.
 */
export function parseStudentsSheet(matrix: unknown[][], opts: { swapNames?: boolean } = {}): ParsedSheet {
  const table = matrix.map((r) => (Array.isArray(r) ? r.map(clean) : [])).filter((r) => r.some(Boolean));
  if (table.length === 0) return { rows: [], splitFullName: false };

  // Header: one of the first rows where at least two cells have a known meaning
  let headerIndex = -1;
  let roles: (Role | null)[] = [];
  for (let i = 0; i < Math.min(table.length, 10); i++) {
    const r = table[i].map(roleOfHeader);
    if (r.filter(Boolean).length >= 2) {
      headerIndex = i;
      roles = r;
      break;
    }
  }

  let data: string[][];
  if (headerIndex >= 0) {
    data = table.slice(headerIndex + 1);
  } else {
    data = table;
    const width = Math.max(...table.map((r) => r.length));
    const phoneCols: number[] = [];
    const textCols: number[] = [];
    for (let c = 0; c < width; c++) {
      const cells = table.map((r) => r[c] || '').filter(Boolean);
      if (cells.length === 0) continue;
      const phoneShare = cells.filter(looksLikePhone).length / cells.length;
      const numeric = cells.every((v) => /^\d{1,4}$/.test(v));
      if (phoneShare >= 0.6) phoneCols.push(c);
      else if (!numeric) textCols.push(c);
    }
    roles = new Array(width).fill(null);
    if (phoneCols[0] !== undefined) roles[phoneCols[0]] = 'phone';
    if (phoneCols[1] !== undefined) roles[phoneCols[1]] = 'parent';
    if (textCols.length >= 2) {
      roles[textCols[0]] = 'first';
      roles[textCols[1]] = 'last';
    } else if (textCols.length === 1) {
      roles[textCols[0]] = 'full';
    }
  }

  const col = (role: Role) => roles.indexOf(role);
  const iFirst = col('first');
  const iLast = col('last');
  const iFull = col('full');
  const iPhone = col('phone');
  const iParent = col('parent');
  const splitFullName = iFirst < 0 && iLast < 0 && iFull >= 0;

  const rows: ParsedStudentRow[] = data.map((r, n) => {
    let firstName = iFirst >= 0 ? r[iFirst] || '' : '';
    let lastName = iLast >= 0 ? r[iLast] || '' : '';
    if (splitFullName) {
      const tokens = (r[iFull] || '').split(' ').filter(Boolean);
      // "Familiya Ism [Sharif]" is the usual order of Uzbek lists; the swap option flips it
      if (opts.swapNames) {
        firstName = tokens[0] || '';
        lastName = tokens.slice(1).join(' ');
      } else {
        lastName = tokens[0] || '';
        firstName = tokens.slice(1).join(' ');
      }
    }
    const phone = iPhone >= 0 ? firstPhone(r[iPhone] || '') : '';
    let parentPhone = iParent >= 0 ? firstPhone(r[iParent] || '') : '';
    if (parentPhone && !isValidUzPhone(parentPhone)) parentPhone = '';

    let problem: string | null = null;
    if (!firstName || !lastName) problem = 'name';
    else if (!isValidUzPhone(phone)) problem = 'phone';

    return { line: n + 1, firstName, lastName, phone, parentPhone, problem };
  });

  return { rows, splitFullName };
}
