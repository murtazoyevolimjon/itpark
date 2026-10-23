import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { requireStaff } from '@/lib/authz';
import { serverErrorResponse } from '@/lib/dbErrors';
import { fetchAll } from '@/lib/pagedFetch';
import { serializeStudentCreds } from '@/lib/credentials';
import { normalizeName, phoneKey } from '@/lib/studentRules';
import { isValidUzPhone, normalizeUzPhone } from '@/utils/uzPhone';

const MAX_ROWS = 2000;
const CHUNK = 300;

interface ImportRow {
  firstName?: unknown;
  lastName?: unknown;
  phone?: unknown;
  parentPhone?: unknown;
}

/**
 * Adds many students at once (from an Excel / CSV list). Phones are normalised to +998, the same person
 * (same phone and name) is never created twice, and the optional group must have room for everyone.
 * Rows that cannot be added are returned with the reason instead of failing the whole file.
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ message: "Avtorizatsiyadan o'tilmagan" }, { status: 401 });
    }
    const staffOnly = requireStaff(authUser);
    if (staffOnly) return staffOnly;

    const body = await req.json();
    const rows: ImportRow[] = Array.isArray(body?.rows) ? body.rows : [];
    const groupId: string = typeof body?.groupId === 'string' ? body.groupId : '';

    if (rows.length === 0) return NextResponse.json({ message: "Ro'yxat bo'sh" }, { status: 400 });
    if (rows.length > MAX_ROWS) {
      return NextResponse.json({ message: `Bir martada ${MAX_ROWS} tagacha o'quvchi yuklash mumkin` }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    let group: any = null;
    if (groupId) {
      const { data } = await supabase
        .from('groups')
        .select('id, name, status, room:rooms(capacity, name)')
        .eq('id', groupId)
        .eq('centerId', authUser.centerId)
        .maybeSingle();
      if (!data) return NextResponse.json({ message: 'Guruh topilmadi' }, { status: 404 });
      if (data.status === 'TUGAGAN') {
        return NextResponse.json({ message: "Bu guruh tugagan, unga yangi talaba qo'shib bo'lmaydi" }, { status: 400 });
      }
      group = data;
    }

    const existing = await fetchAll<any>((from, to) =>
      supabase
        .from('students')
        .select('id, firstName, lastName, phone')
        .eq('centerId', authUser.centerId)
        .order('id')
        .range(from, to)
    );
    const personKey = (first: string, last: string, phone: string) =>
      `${phoneKey(phone)}|${normalizeName(first)}|${normalizeName(last)}`;
    const known = new Set(existing.map((s) => personKey(s.firstName || '', s.lastName || '', s.phone || '')));

    const skipped: { row: number; name: string; reason: string }[] = [];
    const toCreate: { firstName: string; lastName: string; phone: string; parent: string | null }[] = [];

    rows.forEach((r, i) => {
      const firstName = String(r?.firstName ?? '').trim().slice(0, 60);
      const lastName = String(r?.lastName ?? '').trim().slice(0, 60);
      const name = `${firstName} ${lastName}`.trim() || '-';
      const phone = normalizeUzPhone(r?.phone);
      let parent: string | null = normalizeUzPhone(r?.parentPhone) || null;

      if (!firstName || !lastName) return skipped.push({ row: i + 1, name, reason: 'Ism yoki familiya yo\'q' });
      if (!isValidUzPhone(phone)) return skipped.push({ row: i + 1, name, reason: "Telefon raqam noto'g'ri" });
      // The parent phone is optional: a bad one is dropped, the student is still added
      if (parent && !isValidUzPhone(parent)) parent = null;

      const key = personKey(firstName, lastName, phone);
      if (known.has(key)) return skipped.push({ row: i + 1, name, reason: "Allaqachon ro'yxatda (yoki faylda takrorlangan)" });
      known.add(key);
      toCreate.push({ firstName, lastName, phone, parent });
    });

    if (group) {
      const capacity = Number(group.room?.capacity) || 0;
      if (capacity > 0 && toCreate.length > 0) {
        const { count } = await supabase
          .from('student_groups')
          .select('id', { count: 'exact', head: true })
          .eq('groupId', groupId);
        const free = capacity - (count || 0);
        if (toCreate.length > free) {
          return NextResponse.json(
            {
              message: `Guruhda ${Math.max(free, 0)} ta bo'sh joy bor ("${group.room?.name || 'xona'}" sig'imi ${capacity}), siz esa ${toCreate.length} ta o'quvchi qo'shmoqchisiz. Boshqa guruh tanlang yoki xona sig'imini oshiring.`,
            },
            { status: 409 }
          );
        }
      }
    }

    const nowIso = new Date().toISOString();
    const credsBlob = serializeStudentCreds('', '', '');
    const ids = toCreate.map(() => crypto.randomUUID());
    let created = 0;

    for (let i = 0; i < toCreate.length; i += CHUNK) {
      const slice = toCreate.slice(i, i + CHUNK);
      const { error } = await supabase.from('students').insert(
        slice.map((s, k) => ({
          id: ids[i + k],
          firstName: s.firstName,
          lastName: s.lastName,
          birthDate: nowIso,
          phone: s.phone,
          fatherPhone: s.parent,
          motherPhone: null,
          passportSeries: credsBlob,
          gender: 'ERKAK',
          isSchoolStudent: false,
          status: 'FAOL',
          centerId: authUser.centerId,
          updatedAt: nowIso,
        }))
      );
      if (error) {
        console.error('[import] students insert failed', error.code, error.message);
        return NextResponse.json(
          { message: `Yuklash ${created} ta o'quvchidan keyin to'xtadi. Faylni qayta yuklasangiz, qo'shilganlar o'tkazib yuboriladi.`, created, skipped },
          { status: 500 }
        );
      }
      if (groupId) {
        const { error: linkError } = await supabase.from('student_groups').insert(
          slice.map((_, k) => ({
            id: crypto.randomUUID(),
            studentId: ids[i + k],
            groupId,
            centerId: authUser.centerId,
            updatedAt: nowIso,
          }))
        );
        if (linkError) console.error('[import] group link failed', linkError.code, linkError.message);
      }
      created += slice.length;
    }

    return NextResponse.json({ created, skipped, groupName: group?.name || null });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
