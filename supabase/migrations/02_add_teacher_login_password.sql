-- ====================================================
-- MIGRATION: O'qituvchilar uchun login va parol ustunlari
-- ====================================================

-- 1. "teachers" jadvaliga "login" va "password" ustunlarini qo'shish
ALTER TABLE "teachers" ADD COLUMN IF NOT EXISTS "login" TEXT UNIQUE;
ALTER TABLE "teachers" ADD COLUMN IF NOT EXISTS "password" TEXT;

-- 2. "Role" enumiga 'TEACHER' ni qo'shish (agar kerak bo'lsa)
DO $$ BEGIN
    ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'TEACHER';
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. Ruxsatlarni yangilash
GRANT ALL ON TABLE "teachers" TO anon, authenticated, service_role;
