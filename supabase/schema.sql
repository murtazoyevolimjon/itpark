-- ====================================================
-- ITPARK CRM - TO'LIQ SUPABASE MA'LUMOTLAR BAZASI SXEMASI
-- ====================================================

-- 1. ENUM TURLARI
DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'MANAGER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "GroupDay" AS ENUM ('DUSH', 'SESH', 'CHOR', 'PAY', 'JU', 'SHAN', 'YAK');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "GroupStatus" AS ENUM ('FAOL', 'TUGAGAN', 'TO_XTATILGAN');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "TeacherSalaryType" AS ENUM ('FIXED', 'PERCENT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "ActiveStatus" AS ENUM ('FAOL', 'NOFAOL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "StudentGender" AS ENUM ('ERKAK', 'AYOL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "StudentStatus" AS ENUM ('FAOL', 'BITIRGAN', 'CHIQIB_KETGAN');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "AttendanceStatus" AS ENUM ('KELGAN', 'KELMAGAN', 'KECHIKKAN');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "PaymentMethod" AS ENUM ('NAQD', 'KARTA', 'OTKAZMA');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "PaymentStatus" AS ENUM ('TOLANGAN', 'TOLANMAGAN', 'QISMAN');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "ExpenseType" AS ENUM ('USTOZ_MAOSHI', 'IJARA', 'KOMMUNAL', 'REKLAMA', 'BOSHQA');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "ExpenseStatus" AS ENUM ('KUTILMOQDA', 'TOLANGAN');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. JADVALLAR (TABLES)
CREATE TABLE IF NOT EXISTS "centers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "phone" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ADMIN',
    "centerId" TEXT NOT NULL REFERENCES "centers"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "courses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "centerId" TEXT NOT NULL REFERENCES "centers"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "rooms" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "floor" INTEGER NOT NULL,
    "number" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "centerId" TEXT NOT NULL REFERENCES "centers"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "teachers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passportSeries" TEXT,
    "salaryType" "TeacherSalaryType" NOT NULL DEFAULT 'FIXED',
    "salaryValue" DOUBLE PRECISION NOT NULL,
    "status" "ActiveStatus" NOT NULL DEFAULT 'FAOL',
    "centerId" TEXT NOT NULL REFERENCES "centers"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "groups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "courseId" TEXT NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE,
    "teacherId" TEXT NOT NULL REFERENCES "teachers"("id") ON DELETE CASCADE,
    "roomId" TEXT NOT NULL REFERENCES "rooms"("id") ON DELETE CASCADE,
    "days" "GroupDay"[],
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "status" "GroupStatus" NOT NULL DEFAULT 'FAOL',
    "startDate" TIMESTAMP(3) NOT NULL,
    "centerId" TEXT NOT NULL REFERENCES "centers"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "students" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "phone" TEXT NOT NULL,
    "fatherPhone" TEXT,
    "motherPhone" TEXT,
    "passportSeries" TEXT,
    "gender" "StudentGender" NOT NULL,
    "isSchoolStudent" BOOLEAN NOT NULL DEFAULT false,
    "status" "StudentStatus" NOT NULL DEFAULT 'FAOL',
    "centerId" TEXT NOT NULL REFERENCES "centers"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "student_groups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
    "groupId" TEXT NOT NULL REFERENCES "groups"("id") ON DELETE CASCADE,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "centerId" TEXT NOT NULL REFERENCES "centers"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "student_groups_studentId_groupId_key" UNIQUE ("studentId", "groupId")
);

CREATE TABLE IF NOT EXISTS "attendances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
    "groupId" TEXT NOT NULL REFERENCES "groups"("id") ON DELETE CASCADE,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "note" TEXT,
    "centerId" TEXT NOT NULL REFERENCES "centers"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attendances_studentId_groupId_date_key" UNIQUE ("studentId", "groupId", "date")
);

CREATE TABLE IF NOT EXISTS "employees" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "salary" DOUBLE PRECISION NOT NULL,
    "hiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ActiveStatus" NOT NULL DEFAULT 'FAOL',
    "centerId" TEXT NOT NULL REFERENCES "centers"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
    "groupId" TEXT REFERENCES "groups"("id") ON DELETE SET NULL,
    "courseId" TEXT REFERENCES "courses"("id") ON DELETE SET NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" "PaymentMethod" NOT NULL DEFAULT 'NAQD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'TOLANGAN',
    "receivedById" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
    "centerId" TEXT NOT NULL REFERENCES "centers"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "expenses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" "ExpenseType" NOT NULL,
    "ownerName" TEXT,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'TOLANGAN',
    "note" TEXT,
    "centerId" TEXT NOT NULL REFERENCES "centers"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "certificates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
    "courseId" TEXT NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serialNumber" TEXT NOT NULL,
    "centerId" TEXT NOT NULL REFERENCES "centers"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "certificates_centerId_serialNumber_key" UNIQUE ("centerId", "serialNumber")
);

-- 3. RLS XAVFSIZLIK CHEKLOVLARINI BEKOR QILISH (API ULANISHI UCHUN)
ALTER TABLE "centers" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "users" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "courses" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "rooms" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "teachers" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "groups" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "students" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "student_groups" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "attendances" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "employees" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "expenses" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "certificates" DISABLE ROW LEVEL SECURITY;

-- 4. STANDART ADMIN FOYDALANUVCHISI VA MARKAZ
INSERT INTO "centers" ("id", "name", "email", "phone", "password")
VALUES (
    'f05c31e9-58dd-481e-8f4f-eb2979982cb1',
    'IT-Park Academy',
    'admin@itpark.uz',
    '998901234567',
    '$2b$10$hO.GbeIpLO17O0kLjh5m0u1QHfLDFFBwfGtyzKaXL1r/KWi4a5xFK'
)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "users" ("id", "fullName", "email", "password", "role", "centerId")
VALUES (
    'a11c31e9-58dd-481e-8f4f-eb2979982cb1',
    'Administrator',
    'admin@itpark.uz',
    '$2b$10$hO.GbeIpLO17O0kLjh5m0u1QHfLDFFBwfGtyzKaXL1r/KWi4a5xFK',
    'OWNER',
    'f05c31e9-58dd-481e-8f4f-eb2979982cb1'
)
ON CONFLICT ("id") DO NOTHING;
