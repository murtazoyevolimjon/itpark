-- Oylik qarz hisobi talabaning guruhdagi BIRINCHI DAVOMATIDAN boshlanadi.
-- Davomat yozuvlari 2 oydan keyin o'chiriladi, shuning uchun birinchi davomat sanasi alohida saqlanadi.
-- Supabase SQL Editor'da bir marta ishga tushiring (qayta ishga tushirsangiz ham zarar yo'q).

ALTER TABLE student_groups
  ADD COLUMN IF NOT EXISTS "billingStartDate" timestamptz;

-- Hozirgi talabalar: davomati bor bo'lsa shu davomatning eng erta sanasi, bo'lmasa guruhga qo'shilgan sana.
-- (Shunda hozir o'qiyotgan talabalarning qarzi yo'qolib qolmaydi.)
UPDATE student_groups sg
SET "billingStartDate" = COALESCE(
  (SELECT MIN(a."date") FROM attendances a WHERE a."studentId" = sg."studentId" AND a."groupId" = sg."groupId"),
  sg."joinedAt"
)
WHERE sg."billingStartDate" IS NULL;

-- Yangi qo'shilgan talabalarda bu maydon bo'sh bo'ladi va birinchi davomat saqlanganda to'ldiriladi.
