/** Rules shared by the developer (superadmin) routes that create / edit centers. */

export const MIN_PASSWORD_LENGTH = 6;

export function validateCenterInput(input: {
  name?: string;
  login?: string;
  password?: string;
  adminName?: string;
  phone?: string;
}): string | null {
  if (input.name !== undefined) {
    if (!input.name.trim()) return "O'quv markaz nomi kiritilishi shart";
    if (input.name.trim().length > 100) return "Markaz nomi 100 belgidan oshmasligi kerak";
  }
  if (input.login !== undefined) {
    const login = input.login.trim();
    if (login.length < 3 || login.length > 60) return "Login 3 dan 60 gacha belgidan iborat bo'lishi kerak";
    if (/\s/.test(login)) return "Login ichida bo'sh joy bo'lmasligi kerak";
  }
  if (input.password !== undefined) {
    if (input.password.length < MIN_PASSWORD_LENGTH) {
      return `Parol kamida ${MIN_PASSWORD_LENGTH} ta belgidan iborat bo'lishi kerak`;
    }
    if (input.password.length > 100) return 'Parol juda uzun';
  }
  if (input.adminName !== undefined && input.adminName.length > 100) {
    return "Mas'ul shaxs ismi 100 belgidan oshmasligi kerak";
  }
  if (input.phone !== undefined && input.phone.length > 30) {
    return "Telefon raqam noto'g'ri";
  }
  return null;
}

/** Escapes % and _ so a login is matched literally by ilike. */
export const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * A login must be unique across center owners, center records and teachers
 * (the login endpoint looks all of them up, so a clash would shadow one account with another).
 * Returns an Uzbek error message, or null when the login is free.
 */
export async function findLoginConflict(
  supabase: any,
  login: string,
  exclude?: { centerId?: string }
): Promise<string | null> {
  const pattern = escapeLike(login.trim());

  const [users, centers, teachers] = await Promise.all([
    supabase.from('users').select('id, centerId').ilike('email', pattern).limit(2),
    supabase.from('centers').select('id').ilike('email', pattern).limit(2),
    supabase.from('teachers').select('id').ilike('login', pattern).limit(1),
  ]);

  const userClash = (users.data || []).some((u: any) => !exclude?.centerId || u.centerId !== exclude.centerId);
  const centerClash = (centers.data || []).some((c: any) => !exclude?.centerId || c.id !== exclude.centerId);

  if (userClash) return `"${login}" logini allaqachon mavjud! Boshqa login tanlang.`;
  if (centerClash) return `"${login}" logini allaqachon biriktirilgan! Boshqa login tanlang.`;
  if ((teachers.data || []).length > 0) return `"${login}" logini o'qituvchiga biriktirilgan! Boshqa login tanlang.`;
  return null;
}
