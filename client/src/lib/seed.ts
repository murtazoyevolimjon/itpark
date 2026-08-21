import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { createServerSupabaseClient } from './supabase/server';

export async function seedSupabaseIfNeeded() {
  const supabase = createServerSupabaseClient();

  const { count } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  if (count && count > 0) {
    return; // Already seeded
  }

  console.log('🌱 Supabase ma\'lumotlar bazasini boshlang\'ich ma\'lumotlar bilan to\'ldirish boshlandi...');

  const hashedPassword = await bcrypt.hash('password123', 10);
  const centerId = 'f05c31e9-58dd-481e-8f4f-eb2979982cb1';
  const userId = 'a11c31e9-58dd-481e-8f4f-eb2979982cb1';

  // 1. Create Center
  await supabase.from('centers').insert({
    id: centerId,
    name: 'IT-Park Academy',
    email: 'admin@itpark.uz',
    phone: '998901234567',
    password: hashedPassword,
  });

  // 2. Create User
  await supabase.from('users').insert({
    id: userId,
    fullName: 'Administrator',
    email: 'admin@itpark.uz',
    password: hashedPassword,
    role: 'OWNER',
    centerId: centerId,
  });

  // 3. Create Courses
  const course1Id = crypto.randomUUID();
  const course2Id = crypto.randomUUID();
  const course3Id = crypto.randomUUID();

  await supabase.from('courses').insert([
    {
      id: course1Id,
      name: 'Frontend Web Dasturlash',
      price: 600000,
      description: 'HTML, CSS, JavaScript, React va TypeScript kurslari',
      centerId,
      updatedAt: new Date().toISOString(),
    },
    {
      id: course2Id,
      name: 'Python & Backend Dasturlash',
      price: 700000,
      description: 'Python, Django, FastAPI va PostgreSQL backend kurslari',
      centerId,
      updatedAt: new Date().toISOString(),
    },
    {
      id: course3Id,
      name: 'Grafik Dizayn & UI/UX',
      price: 550000,
      description: 'Figma, Adobe Photoshop, Illustrator va zamonaviy veb-dizayn',
      centerId,
      updatedAt: new Date().toISOString(),
    },
  ]);

  // 4. Create Rooms
  const room1Id = crypto.randomUUID();
  const room2Id = crypto.randomUUID();

  await supabase.from('rooms').insert([
    { id: room1Id, name: 'Lab 1', floor: 1, number: '101', capacity: 15, centerId, updatedAt: new Date().toISOString() },
    { id: room2Id, name: 'Lab 2', floor: 2, number: '201', capacity: 20, centerId, updatedAt: new Date().toISOString() },
  ]);

  // 5. Create Teachers
  const teacher1Id = crypto.randomUUID();
  const teacher2Id = crypto.randomUUID();

  await supabase.from('teachers').insert([
    {
      id: teacher1Id,
      firstName: 'Anvar',
      lastName: 'Rustamov',
      phone: '998901112233',
      salaryType: 'PERCENT',
      salaryValue: 40,
      status: 'FAOL',
      centerId,
      updatedAt: new Date().toISOString(),
    },
    {
      id: teacher2Id,
      firstName: 'Dilshod',
      lastName: 'Qodirov',
      phone: '998903334455',
      salaryType: 'FIXED',
      salaryValue: 4500000,
      status: 'FAOL',
      centerId,
      updatedAt: new Date().toISOString(),
    },
  ]);

  // 6. Create Groups
  const group1Id = crypto.randomUUID();
  const group2Id = crypto.randomUUID();

  await supabase.from('groups').insert([
    {
      id: group1Id,
      name: 'FE-24 (React Pro)',
      courseId: course1Id,
      teacherId: teacher1Id,
      roomId: room1Id,
      days: ['DUSH', 'CHOR', 'JU'],
      startTime: '09:00',
      endTime: '11:00',
      status: 'FAOL',
      startDate: new Date('2026-01-10').toISOString(),
      centerId,
      updatedAt: new Date().toISOString(),
    },
    {
      id: group2Id,
      name: 'PY-10 (Backend)',
      courseId: course2Id,
      teacherId: teacher2Id,
      roomId: room2Id,
      days: ['SESH', 'PAY', 'SHAN'],
      startTime: '14:00',
      endTime: '16:00',
      status: 'FAOL',
      startDate: new Date('2026-02-01').toISOString(),
      centerId,
      updatedAt: new Date().toISOString(),
    },
  ]);

  // 7. Create Sample Students
  const firstNames = ['Azizbek', 'Jasur', 'Madina', 'Shahzod', 'Gulnoza', 'Olimjon', 'Nodira', 'Bekzod', 'Sarvar', 'Zilola'];
  const lastNames = ['Karimov', 'Rahimov', 'Usmonova', 'Aliyev', 'Tursunova', 'Murtazoyev', 'Ismoilova', 'Qobilov', 'Ahmedov', 'Sobirova'];

  const studentInserts: any[] = [];
  const studentGroupInserts: any[] = [];
  const paymentInserts: any[] = [];
  const attendanceInserts: any[] = [];

  for (let i = 0; i < 10; i++) {
    const sId = crypto.randomUUID();
    const isMale = i % 2 === 0;
    const targetGroup = i % 2 === 0 ? group1Id : group2Id;
    const targetCourse = i % 2 === 0 ? course1Id : course2Id;

    studentInserts.push({
      id: sId,
      firstName: firstNames[i],
      lastName: lastNames[i],
      birthDate: new Date('2004-05-15').toISOString(),
      phone: `9989012345${i < 10 ? '0' + i : i}`,
      gender: isMale ? 'ERKAK' : 'AYOL',
      isSchoolStudent: false,
      status: 'FAOL',
      centerId,
      updatedAt: new Date().toISOString(),
    });

    studentGroupInserts.push({
      id: crypto.randomUUID(),
      studentId: sId,
      groupId: targetGroup,
      centerId,
      updatedAt: new Date().toISOString(),
    });

    paymentInserts.push({
      id: crypto.randomUUID(),
      studentId: sId,
      groupId: targetGroup,
      courseId: targetCourse,
      amount: 600000,
      paymentDate: new Date().toISOString(),
      method: i % 2 === 0 ? 'KARTA' : 'NAQD',
      status: i % 4 === 0 ? 'QISMAN' : 'TOLANGAN',
      receivedById: userId,
      centerId,
      updatedAt: new Date().toISOString(),
    });

    // Sample Attendance
    for (let d = 0; d < 5; d++) {
      const attDate = new Date();
      attDate.setDate(attDate.getDate() - d);
      attendanceInserts.push({
        id: crypto.randomUUID(),
        studentId: sId,
        groupId: targetGroup,
        date: attDate.toISOString(),
        status: d === 2 ? 'KELMAGAN' : d === 4 ? 'KECHIKKAN' : 'KELGAN',
        centerId,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  await supabase.from('students').insert(studentInserts);
  await supabase.from('student_groups').insert(studentGroupInserts);
  await supabase.from('payments').insert(paymentInserts);
  await supabase.from('attendances').insert(attendanceInserts);

  // 8. Sample Expenses
  await supabase.from('expenses').insert([
    {
      id: crypto.randomUUID(),
      amount: 2500000,
      type: 'IJARA',
      ownerName: 'Bino egasi',
      status: 'TOLANGAN',
      note: 'Oylik bino ijarasi to\'lovi',
      centerId,
      updatedAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      amount: 800000,
      type: 'REKLAMA',
      ownerName: 'Instagram Ads',
      status: 'TOLANGAN',
      note: 'Target reklama xarajatlari',
      centerId,
      updatedAt: new Date().toISOString(),
    },
  ]);

  console.log('🚀 Supabase seed muvaffaqiyatli yakunlandi!');
}
