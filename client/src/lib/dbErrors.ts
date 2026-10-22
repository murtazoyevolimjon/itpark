import { NextResponse } from 'next/server';

interface DbError {
  code?: string;
  message: string;
  details?: string;
}

// Friendly Uzbek messages for unique-index violations (see supabase/migrations/*unique*.sql).
const UNIQUE_MESSAGES: Record<string, string> = {
  courses_center_name_uniq: 'Bunday nomli kurs allaqachon mavjud!',
  rooms_center_number_uniq: 'Bunday raqamli xona allaqachon mavjud!',
  groups_center_name_uniq: 'Bunday nomli guruh allaqachon mavjud!',
  students_center_phone_subject_uniq:
    "Bu talaba (shu telefon raqami bilan) allaqachon shu fanga qo'shilgan! Bitta talabani bir xil fanga ikki marta qo'shib bo'lmaydi.",
  payments_student_group_month_uniq:
    "Bu talaba shu guruh uchun ushbu oyda allaqachon to'lov qilgan! Bir oyda bitta fandan faqat 1 marta to'lov qilinishi mumkin.",
  attendances_studentId_groupId_date_key: 'Bu kun uchun davomat allaqachon saqlangan.',
  student_groups_studentId_groupId_key: "Talaba bu guruhga allaqachon qo'shilgan.",
};

/** A 500 that never shows internal details to the client; the cause goes to the server log. */
export function serverErrorResponse(error?: unknown) {
  // Next.js uses this error to mark a route as dynamic while building: it must pass through, not become a 500
  if (error && typeof error === 'object' && (error as { digest?: string }).digest === 'DYNAMIC_SERVER_USAGE') {
    throw error;
  }
  if (error) console.error('[api]', error);
  return NextResponse.json({ message: "Serverda xatolik yuz berdi. Qayta urinib ko'ring" }, { status: 500 });
}

/**
 * Turns a Supabase error into a JSON response: unique violations become a clear 409, a few other constraint
 * failures get a short explanation, everything else stays generic (raw database messages reveal table and
 * column names).
 */
export function dbErrorResponse(error: DbError) {
  if (error.code === '23505') {
    const text = `${error.message} ${error.details || ''}`;
    const key = Object.keys(UNIQUE_MESSAGES).find((k) => text.includes(k));
    return NextResponse.json(
      { message: key ? UNIQUE_MESSAGES[key] : 'Bunday yozuv allaqachon mavjud!' },
      { status: 409 }
    );
  }
  if (error.code === '23503') {
    return NextResponse.json(
      { message: "Bu yozuv boshqa ma'lumotlar bilan bog'langan yoki bog'langan yozuv topilmadi" },
      { status: 409 }
    );
  }
  if (error.code === '23502') {
    return NextResponse.json({ message: "Majburiy maydon to'ldirilmagan" }, { status: 400 });
  }
  if (error.code === '22P02' || error.code === '22007') {
    return NextResponse.json({ message: "Ma'lumot formati noto'g'ri" }, { status: 400 });
  }
  console.error('[db]', error.code, error.message);
  return serverErrorResponse();
}
