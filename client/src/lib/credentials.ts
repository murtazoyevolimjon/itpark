import { SupabaseClient } from '@supabase/supabase-js';

export interface StudentCredentials {
  login: string;
  password: string;
  subject: string;
  tgChatId?: string;
  tgUser?: string;
  parentTgChatId?: string;
}

export interface TeacherCredentials {
  password: string;
  passportSeries: string;
}

/**
 * Parse student credentials and subject stored in student's passportSeries field
 */
export function parseStudentCreds(
  rawPassportSeries: string | null | undefined,
  phone: string = ''
): StudentCredentials {
  const cleanPhone = (phone || '').replace(/\D/g, '');
  const fallbackLogin = cleanPhone || `talaba_${Math.floor(1000 + Math.random() * 9000)}`;
  const fallbackPassword = cleanPhone && cleanPhone.length >= 6 ? cleanPhone.slice(-6) : '123456';

  if (!rawPassportSeries) {
    return {
      login: fallbackLogin,
      password: fallbackPassword,
      subject: '',
    };
  }

  const raw = rawPassportSeries.trim();

  if (raw.startsWith('CRED:')) {
    const payload = raw.substring(5);
    const parts = payload.split('|');
    let login = '';
    let password = '';
    let subject = '';
    let tgChatId = '';
    let tgUser = '';
    let parentTgChatId = '';

    for (const part of parts) {
      if (part.startsWith('login=')) {
        login = part.substring(6).trim();
      } else if (part.startsWith('pass=')) {
        password = part.substring(5).trim();
      } else if (part.startsWith('subj=')) {
        subject = part.substring(5).trim();
      } else if (part.startsWith('tgChatId=')) {
        tgChatId = part.substring(9).trim();
      } else if (part.startsWith('tgUser=')) {
        tgUser = part.substring(7).trim();
      } else if (part.startsWith('parentTg=')) {
        parentTgChatId = part.substring(9).trim();
      }
    }

    return {
      login: login || fallbackLogin,
      password: password || fallbackPassword,
      subject: subject || '',
      tgChatId: tgChatId || undefined,
      tgUser: tgUser || undefined,
      parentTgChatId: parentTgChatId || undefined,
    };
  }

  // Legacy format: rawPassportSeries was purely the subject
  return {
    login: fallbackLogin,
    password: fallbackPassword,
    subject: raw,
  };
}

/**
 * Human-readable subject from a student's passportSeries field.
 * Never returns the raw "CRED:..." payload (it holds login/password/telegram data).
 */
export function getStudentSubject(
  student: { subject?: string | null; passportSeries?: string | null } | null | undefined
): string {
  if (!student) return '';
  if (student.subject) return student.subject;
  const raw = (student.passportSeries || '').trim();
  if (!raw) return '';
  if (raw.startsWith('CRED:')) {
    const part = raw.substring(5).split('|').find((p) => p.startsWith('subj='));
    return part ? part.substring(5).trim() : '';
  }
  return raw;
}

/**
 * Serialize student credentials and subject into passportSeries
 */
export function serializeStudentCreds(
  login: string,
  pass: string,
  subject: string,
  tgChatId?: string,
  tgUser?: string,
  parentTgChatId?: string
): string {
  const cleanLogin = (login || '').trim();
  const cleanPass = (pass || '123456').trim();
  const cleanSubj = (subject || '').trim();

  let res = `CRED:login=${cleanLogin}|pass=${cleanPass}|subj=${cleanSubj}`;
  if (tgChatId) res += `|tgChatId=${tgChatId.trim()}`;
  if (tgUser) res += `|tgUser=${tgUser.trim()}`;
  if (parentTgChatId) res += `|parentTg=${parentTgChatId.trim()}`;
  return res;
}

/**
 * Parse teacher plain password and clean passport series from passportSeries field
 */
export function parseTeacherCreds(
  rawPassportSeries: string | null | undefined,
  fallbackPassword?: string
): TeacherCredentials {
  if (!rawPassportSeries) {
    return {
      password: fallbackPassword || '',
      passportSeries: '',
    };
  }

  const raw = rawPassportSeries.trim();

  if (raw.startsWith('PW:')) {
    const [pwPart, ...psParts] = raw.split('||PS:');
    const plainPass = pwPart.substring(3).trim();
    const cleanPs = psParts.join('||PS:').trim();

    return {
      password: plainPass || fallbackPassword || '',
      passportSeries: cleanPs,
    };
  }

  return {
    password: fallbackPassword || '',
    passportSeries: raw,
  };
}

/**
 * Serialize teacher plain password and passport series into passportSeries field
 */
export function serializeTeacherCreds(
  plainPassword: string,
  passportSeries?: string
): string {
  const cleanPw = (plainPassword || '').trim();
  const cleanPs = (passportSeries || '').trim();

  if (cleanPw) {
    return `PW:${cleanPw}||PS:${cleanPs}`;
  }

  return cleanPs;
}

/**
 * Check if a login identifier is already taken across:
 * 1. users table (email/username)
 * 2. teachers table (login column)
 * 3. students table (parsed credentials)
 */
export async function checkLoginUniqueness(
  supabase: SupabaseClient,
  login: string,
  exclude?: {
    type: 'user' | 'teacher' | 'student';
    id?: string;
  }
): Promise<{ available: boolean; conflictMessage?: string }> {
  const cleanLogin = (login || '').trim().toLowerCase();
  if (!cleanLogin) {
    return { available: false, conflictMessage: 'Login kiritilishi shart' };
  }

  // 1. Check in users table
  const { data: userMatch } = await supabase
    .from('users')
    .select('id, fullName, email')
    .ilike('email', cleanLogin)
    .maybeSingle();

  if (userMatch && (!exclude || exclude.type !== 'user' || exclude.id !== userMatch.id)) {
    return {
      available: false,
      conflictMessage: `Ushbu login (${cleanLogin}) tizim administratori tomonidan band qilingan! Boshqa login tanlang.`,
    };
  }

  // 2. Check in teachers table
  const { data: teacherMatch } = await supabase
    .from('teachers')
    .select('id, firstName, lastName, login')
    .ilike('login', cleanLogin)
    .maybeSingle();

  if (teacherMatch && (!exclude || exclude.type !== 'teacher' || exclude.id !== teacherMatch.id)) {
    return {
      available: false,
      conflictMessage: `Ushbu login (${cleanLogin}) o'qituvchi (${teacherMatch.firstName} ${teacherMatch.lastName}) tomonidan band qilingan! Boshqa login tanlang.`,
    };
  }

  // 3. Check in students table
  const { data: studentsList } = await supabase
    .from('students')
    .select('id, firstName, lastName, phone, passportSeries')
    .limit(1000);

  if (studentsList) {
    for (const st of studentsList) {
      if (exclude && exclude.type === 'student' && exclude.id === st.id) {
        continue;
      }

      const creds = parseStudentCreds(st.passportSeries, st.phone);
      if (creds.login.toLowerCase() === cleanLogin) {
        return {
          available: false,
          conflictMessage: `Ushbu login (${cleanLogin}) talaba (${st.firstName} ${st.lastName}) tomonidan band qilingan! Boshqa login tanlang.`,
        };
      }
    }
  }

  return { available: true };
}
