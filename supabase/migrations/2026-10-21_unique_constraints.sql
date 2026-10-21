-- =====================================================================
-- Takroriy yozuvlarga qarshi cheklovlar (unique indexlar)
-- Supabase -> SQL Editor da ishga tushiring.
--
-- 1-QADAM: avval pastdagi "TEKSHIRUV" so'rovlarini ishga tushiring.
--          Natija BO'SH bo'lsa, 2-QADAMga o'ting. Natija chiqsa - o'sha
--          takroriy qatorlarni qo'lda o'chiring/nomini o'zgartiring,
--          aks holda tegishli index yaratilmaydi.
-- 2-QADAM: "YARATISH" qismini ishga tushiring (har bir index alohida,
--          IF NOT EXISTS - qayta ishga tushirish xavfsiz).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1-QADAM: TEKSHIRUV (takrorlar bormi?)
-- ---------------------------------------------------------------------

-- Kurslar: bir markazda bir xil nom
SELECT "centerId", lower(btrim("name")) AS key, count(*) FROM "courses"
GROUP BY 1, 2 HAVING count(*) > 1;

-- Xonalar: bir markazda bir xil raqam
SELECT "centerId", lower(btrim("number")) AS key, count(*) FROM "rooms"
GROUP BY 1, 2 HAVING count(*) > 1;

-- Guruhlar: bir markazda bir xil nom
SELECT "centerId", lower(btrim("name")) AS key, count(*) FROM "groups"
GROUP BY 1, 2 HAVING count(*) > 1;

-- Talabalar: bir xil telefon (oxirgi 9 raqam) + bir xil fan
SELECT "centerId",
       right(regexp_replace(coalesce("phone", ''), '\D', '', 'g'), 9) AS phone_key,
       lower(btrim(CASE WHEN "passportSeries" LIKE 'CRED:%'
                        THEN coalesce(substring("passportSeries" from 'subj=([^|]*)'), '')
                        ELSE coalesce("passportSeries", '') END)) AS subject_key,
       count(*)
FROM "students"
GROUP BY 1, 2, 3
HAVING count(*) > 1 AND lower(btrim(CASE WHEN "passportSeries" LIKE 'CRED:%'
                        THEN coalesce(substring("passportSeries" from 'subj=([^|]*)'), '')
                        ELSE coalesce("passportSeries", '') END)) <> ''
   AND right(regexp_replace(coalesce("phone", ''), '\D', '', 'g'), 9) <> '';

-- To'lovlar: bir oyda bir talaba bir guruhga bir necha marta to'lagan
SELECT "studentId", coalesce("groupId", '') AS grp,
       date_trunc('month', "paymentDate") AS month, count(*)
FROM "payments" WHERE "status" <> 'TOLANMAGAN'
GROUP BY 1, 2, 3 HAVING count(*) > 1;


-- ---------------------------------------------------------------------
-- 2-QADAM: YARATISH
-- ---------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS "courses_center_name_uniq"
  ON "courses" ("centerId", lower(btrim("name")));

CREATE UNIQUE INDEX IF NOT EXISTS "rooms_center_number_uniq"
  ON "rooms" ("centerId", lower(btrim("number")));

CREATE UNIQUE INDEX IF NOT EXISTS "groups_center_name_uniq"
  ON "groups" ("centerId", lower(btrim("name")));

-- Talabalar: telefon va fan "passportSeries" ichidagi matndan olinadi, shuning
-- uchun ikkita avtomatik (generated) ustun qo'shiladi.
ALTER TABLE "students"
  ADD COLUMN IF NOT EXISTS "phoneKey" TEXT GENERATED ALWAYS AS (
    right(regexp_replace(coalesce("phone", ''), '\D', '', 'g'), 9)
  ) STORED;

ALTER TABLE "students"
  ADD COLUMN IF NOT EXISTS "subjectKey" TEXT GENERATED ALWAYS AS (
    lower(btrim(CASE WHEN "passportSeries" LIKE 'CRED:%'
                     THEN coalesce(substring("passportSeries" from 'subj=([^|]*)'), '')
                     ELSE coalesce("passportSeries", '') END))
  ) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS "students_center_phone_subject_uniq"
  ON "students" ("centerId", "phoneKey", "subjectKey")
  WHERE "subjectKey" <> '' AND "phoneKey" <> '';

-- To'lovlar: qisman to'lov uchun bir oyda bir necha to'lov mumkin (2026-10-22_partial_payments.sql ga qarang),
-- shuning uchun to'lovlarda unique indeks yaratilmaydi.

-- Davomat va guruh a'zoligi (schema.sql da bor, jonli bazada bo'lmasligi mumkin)
CREATE UNIQUE INDEX IF NOT EXISTS "attendances_studentId_groupId_date_key"
  ON "attendances" ("studentId", "groupId", "date");

CREATE UNIQUE INDEX IF NOT EXISTS "student_groups_studentId_groupId_key"
  ON "student_groups" ("studentId", "groupId");
