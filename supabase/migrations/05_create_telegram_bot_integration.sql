-- ====================================================
-- MIGRATION: Telegram Bot Integratsiyasi uchun ustunlar va loglar
-- ====================================================

-- 1. O'quvchilar jadvaliga Telegram ustunlarini qo'shish (agar mavjud bo'lmasa)
ALTER TABLE IF EXISTS "students" 
ADD COLUMN IF NOT EXISTS "telegramChatId" TEXT,
ADD COLUMN IF NOT EXISTS "telegramUsername" TEXT,
ADD COLUMN IF NOT EXISTS "parentTelegramChatId" TEXT,
ADD COLUMN IF NOT EXISTS "telegramConnectedAt" TIMESTAMP(3);

-- 2. Telegram xabarlari logi
CREATE TABLE IF NOT EXISTS "telegram_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "centerId" TEXT,
    "recipientChatId" TEXT NOT NULL,
    "recipientType" TEXT DEFAULT 'STUDENT', -- 'STUDENT' | 'PARENT' | 'TEACHER'
    "studentId" TEXT REFERENCES "students"("id") ON DELETE SET NULL,
    "messageType" TEXT NOT NULL, -- 'ATTENDANCE' | 'PAYMENT' | 'DEBT_REMINDER' | 'HOMEWORK' | 'CUSTOM'
    "messageText" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT', -- 'SENT' | 'FAILED'
    "errorDetails" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RLS
ALTER TABLE "telegram_logs" DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE "telegram_logs" TO anon, authenticated, service_role;
