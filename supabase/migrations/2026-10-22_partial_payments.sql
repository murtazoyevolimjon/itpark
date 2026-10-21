-- =====================================================================
-- Qisman to'lovlar: bir oyda bir guruhga bir necha to'lov bo'lishi mumkin
-- (jami kurs narxidan oshmaguncha). Buni ilova o'zi tekshiradi.
--
-- Supabase -> SQL Editor da ishga tushiring (qayta ishga tushirish xavfsiz).
-- Eski "bir oyda faqat bitta to'lov" indeksi qisman to'lovga to'sqinlik qiladi.
-- =====================================================================

DROP INDEX IF EXISTS "payments_student_group_month_uniq";

-- Qarz hisobi va to'lovlarni qidirish tezligi uchun (unique emas)
CREATE INDEX IF NOT EXISTS "payments_student_group_date_idx"
  ON "payments" ("studentId", "groupId", "paymentDate");

CREATE INDEX IF NOT EXISTS "payments_center_date_idx"
  ON "payments" ("centerId", "paymentDate");
