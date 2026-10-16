-- ====================================================
-- MIGRATION: Uyga vazifalar va topshirilgan javoblar jadvallari
-- ====================================================

CREATE TABLE IF NOT EXISTS "homeworks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "centerId" TEXT NOT NULL REFERENCES "centers"("id") ON DELETE CASCADE,
    "groupId" TEXT NOT NULL,
    "groupName" TEXT,
    "courseName" TEXT,
    "title" TEXT NOT NULL,
    "desc" TEXT,
    "deadline" TEXT,
    "file" JSONB,
    "teacherId" TEXT REFERENCES "teachers"("id") ON DELETE SET NULL,
    "teacherName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "homework_submissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "centerId" TEXT NOT NULL REFERENCES "centers"("id") ON DELETE CASCADE,
    "hwId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
    "studentName" TEXT NOT NULL,
    "studentPhone" TEXT,
    "submissionLink" TEXT,
    "comment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'KUTILMOQDA',
    "grade" INTEGER,
    "teacherFeedback" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RLS sozlamalari
ALTER TABLE "homeworks" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "homework_submissions" DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE "homeworks" TO anon, authenticated, service_role;
GRANT ALL ON TABLE "homework_submissions" TO anon, authenticated, service_role;
