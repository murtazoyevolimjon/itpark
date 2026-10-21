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

/** Turns a Supabase error into a JSON response; unique violations become a clear 409. */
export function dbErrorResponse(error: DbError) {
  if (error.code === '23505') {
    const text = `${error.message} ${error.details || ''}`;
    const key = Object.keys(UNIQUE_MESSAGES).find((k) => text.includes(k));
    return NextResponse.json(
      { message: key ? UNIQUE_MESSAGES[key] : 'Bunday yozuv allaqachon mavjud!' },
      { status: 409 }
    );
  }
  return NextResponse.json({ message: error.message }, { status: 500 });
}
