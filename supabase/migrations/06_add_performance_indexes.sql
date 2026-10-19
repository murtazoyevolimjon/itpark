-- ====================================================
-- ITPARK CRM - MA'LUMOTLAR BAZASI TEZLIK INDEKSLARI (PERFORMANCE INDEXES)
-- Supabase, Railway yoki Vultr PostgreSQL uchun
-- Ushbu skript barcha qidiruvlar va jadvallararo bog'lanishlarni 
-- Full Table Scan (Seq Scan) o'rniga B-Tree Index orqali 50-100x tezlashtiradi.
-- ====================================================

-- 1. ASOSIY MULTI-TENANT (centerId) INDEKSLARI
CREATE INDEX IF NOT EXISTS idx_users_center_id ON "users"("centerId");
CREATE INDEX IF NOT EXISTS idx_courses_center_id ON "courses"("centerId");
CREATE INDEX IF NOT EXISTS idx_rooms_center_id ON "rooms"("centerId");
CREATE INDEX IF NOT EXISTS idx_teachers_center_id ON "teachers"("centerId");
CREATE INDEX IF NOT EXISTS idx_groups_center_id ON "groups"("centerId");
CREATE INDEX IF NOT EXISTS idx_students_center_id ON "students"("centerId");
CREATE INDEX IF NOT EXISTS idx_student_groups_center_id ON "student_groups"("centerId");
CREATE INDEX IF NOT EXISTS idx_attendances_center_id ON "attendances"("centerId");
CREATE INDEX IF NOT EXISTS idx_employees_center_id ON "employees"("centerId");
CREATE INDEX IF NOT EXISTS idx_payments_center_id ON "payments"("centerId");
CREATE INDEX IF NOT EXISTS idx_expenses_center_id ON "expenses"("centerId");

-- 2. GURUHLAR VA ALOQADOR JADVALLAR INDEKSLARI
CREATE INDEX IF NOT EXISTS idx_groups_teacher_id ON "groups"("teacherId");
CREATE INDEX IF NOT EXISTS idx_groups_course_id ON "groups"("courseId");
CREATE INDEX IF NOT EXISTS idx_groups_room_id ON "groups"("roomId");
CREATE INDEX IF NOT EXISTS idx_groups_status ON "groups"("status");

-- 3. TALABALAR VA GURUH BOG'LANISHI (student_groups)
CREATE INDEX IF NOT EXISTS idx_student_groups_student_id ON "student_groups"("studentId");
CREATE INDEX IF NOT EXISTS idx_student_groups_group_id ON "student_groups"("groupId");

-- 4. DAVOMAT (attendances) INDEKSLARI (Tezkor tekshirish va tarix uchun)
CREATE INDEX IF NOT EXISTS idx_attendances_group_date ON "attendances"("groupId", "date");
CREATE INDEX IF NOT EXISTS idx_attendances_student_id ON "attendances"("studentId");
CREATE INDEX IF NOT EXISTS idx_attendances_date ON "attendances"("date");

-- 5. TO'LOVLAR (payments) INDEKSLARI (Ustozlar maoshi va hisobotlar uchun)
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON "payments"("studentId");
CREATE INDEX IF NOT EXISTS idx_payments_group_id ON "payments"("groupId");
CREATE INDEX IF NOT EXISTS idx_payments_status ON "payments"("status");
CREATE INDEX IF NOT EXISTS idx_payments_date ON "payments"("paymentDate");

-- 6. UYGA VAZIFALAR (homeworks & submissions)
CREATE INDEX IF NOT EXISTS idx_homeworks_group_id ON "homeworks"("groupId");
CREATE INDEX IF NOT EXISTS idx_submissions_hw_student ON "homework_submissions"("homeworkId", "studentId");
